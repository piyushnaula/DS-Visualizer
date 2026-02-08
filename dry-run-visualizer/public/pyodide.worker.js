importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;

const TRACER_SCRIPT = `
import sys
import json
from io import StringIO

# Configuration
__MAX_STEPS__ = 1000
__MAX_HEAP_SIZE__ = 3000 # Safety limit for graph nodes
__user_inputs__ = []
__input_index__ = 0

__trace_data__ = []
__user_code_filename__ = '<user_code>'
__stdout_capture__ = StringIO()
__last_stdout_pos__ = 0
__call_stack__ = []

class ExecutionLimitExceeded(Exception):
    pass

def __custom_input__(prompt=""):
    global __input_index__
    if prompt:
        print(prompt, end='')
    
    if __input_index__ < len(__user_inputs__):
        value = __user_inputs__[__input_index__]
        __input_index__ += 1
        print(value)
        return value
    else:
        print("<no input available>")
        return ""

def __is_primitive__(val):
    return val is None or isinstance(val, (bool, int, float, str))

def __get_object_type__(obj):
    if isinstance(obj, (list, tuple)): return 'list' if isinstance(obj, list) else 'tuple'
    if isinstance(obj, (dict,)): return 'dict'
    if isinstance(obj, (set,)): return 'set'
    
    if hasattr(obj, 'next') and (hasattr(obj, 'val') or hasattr(obj, 'data') or hasattr(obj, 'value')):
        return 'ListNode'
    if (hasattr(obj, 'left') or hasattr(obj, 'right')) and (hasattr(obj, 'val') or hasattr(obj, 'data') or hasattr(obj, 'value')):
        return 'TreeNode'
        
    if hasattr(obj, '__dict__'): return 'object'
    return 'unknown'

def __scan_heap__(local_vars):
    heap = {}
    queue = []
    seen = set()
    
    for name, val in local_vars.items():
        if name.startswith('_') and name != '<return>': continue
        if callable(val): continue
        if str(type(val)).startswith("<class 'module"): continue
        
        if not __is_primitive__(val):
            obj_id = id(val)
            if obj_id not in seen:
                if len(seen) < __MAX_HEAP_SIZE__:
                    queue.append(val)
                    seen.add(obj_id)
    
    while queue:
        obj = queue.pop(0)
        obj_id = id(obj)
        obj_type = __get_object_type__(obj)
        
        serialized = {'type': obj_type, 'id': obj_id}
        
        if obj_type in ('list', 'tuple', 'set'):
            items = []
            collection = obj if not isinstance(obj, set) else list(obj)
            limit = 10
            for item in collection[:limit]:
                if not __is_primitive__(item):
                    item_id = id(item)
                    items.append({'type': 'ref', 'id': item_id})
                    if item_id not in seen:
                        if len(seen) < __MAX_HEAP_SIZE__:
                            seen.add(item_id)
                            queue.append(item)
                        else:
                            items.append('... (truncated)')
                            break
                else:
                    items.append(item)
            if len(collection) > limit:
                items.append('...')
            serialized['value'] = items
            
        elif obj_type == 'dict':
            items = {}
            limit = 10
            for i, (k, v) in enumerate(obj.items()):
                if i >= limit:
                    items['...'] = '...'
                    break
                key_str = str(k)
                if not __is_primitive__(v):
                    v_id = id(v)
                    items[key_str] = {'type': 'ref', 'id': v_id}
                    if v_id not in seen:
                        if len(seen) < __MAX_HEAP_SIZE__:
                            seen.add(v_id)
                            queue.append(v)
                        else:
                            items[key_str] = '... (truncated)'
                else:
                    items[key_str] = v
            serialized['value'] = items
            
        elif obj_type in ('ListNode', 'TreeNode', 'object'):
            data = {}
            attrs = obj.__dict__ if hasattr(obj, '__dict__') else {}
            for k, v in attrs.items():
                if k.startswith('_'): continue
                if not __is_primitive__(v):
                    v_id = id(v)
                    data[k] = {'type': 'ref', 'id': v_id}
                    if v_id not in seen:
                        if len(seen) < __MAX_HEAP_SIZE__:
                            seen.add(v_id)
                            queue.append(v)
                        else:
                            data[k] = '... (truncated)'
                else:
                    data[k] = v
            serialized['value'] = data
            if obj_type == 'object':
                serialized['class'] = type(obj).__name__
        
        heap[str(obj_id)] = serialized
        
    return heap

def __serialize_variable__(val):
    if __is_primitive__(val):
        try:
            if isinstance(val, float) and (val != val or val == float('inf') or val == float('-inf')):
                return str(val)
            return val
        except:
            return str(val)
    else:
        return {'type': 'ref', 'id': id(val)}

def __filter_locals__(local_vars):
    filtered = {}
    for name, value in local_vars.items():
        if name.startswith('__') or name.startswith('_'): continue
        if callable(value): continue
        if str(type(value)).startswith("<class 'module"): continue
        try:
            filtered[name] = __serialize_variable__(value)
        except:
            filtered[name] = '<error>'
    return filtered

def __get_new_stdout__():
    global __last_stdout_pos__
    current_pos = __stdout_capture__.tell()
    if current_pos > __last_stdout_pos__:
        __stdout_capture__.seek(__last_stdout_pos__)
        new_output = __stdout_capture__.read()
        __last_stdout_pos__ = current_pos
        return new_output
    return ""

def __get_function_args__(frame):
    args = {}
    code = frame.f_code
    arg_names = code.co_varnames[:code.co_argcount]
    for name in arg_names:
        if name in frame.f_locals:
            args[name] = __serialize_variable__(frame.f_locals[name])
    return args

def __trace_function__(frame, event, arg):
    global __last_stdout_pos__, __call_stack__
    if frame.f_code.co_filename != __user_code_filename__:
        return __trace_function__
    
    if len(__trace_data__) >= __MAX_STEPS__:
        raise ExecutionLimitExceeded(f"Execution limit exceeded: {__MAX_STEPS__} steps.")
    
    func_name = frame.f_code.co_name
    is_module = func_name == '<module>'
    display_name = func_name if not is_module else '<main>'
    
    if event == 'call':
        frame_info = {
            'name': display_name,
            'line': frame.f_lineno,
            'args': __get_function_args__(frame) if not is_module else {}
        }
        __call_stack__.append(frame_info)
    
    if event in ('line', 'call', 'return'):
        new_output = __get_new_stdout__()
        variables = __filter_locals__(frame.f_locals)
        heap = __scan_heap__(frame.f_locals)
        step = {
            'line': frame.f_lineno,
            'event': event,
            'variables': variables,
            'heap': heap,
            'function': func_name if not is_module else None,
            'stdout': new_output,
            'stackDepth': len(__call_stack__),
            'callStack': list(__call_stack__)
        }
        if event == 'return' and arg is not None:
            step['return_value'] = __serialize_variable__(arg)
            if not __is_primitive__(arg):
                heap.update(__scan_heap__({'<return>': arg}))
        __trace_data__.append(step)
    
    if event == 'return' and __call_stack__:
        if __call_stack__[-1]['name'] == display_name:
            __call_stack__.pop()
    
    return __trace_function__

def __run_with_trace__(code_string, user_inputs):
    global __trace_data__, __stdout_capture__, __last_stdout_pos__, __call_stack__, __user_inputs__, __input_index__
    __trace_data__ = []
    __stdout_capture__ = StringIO()
    __last_stdout_pos__ = 0
    __call_stack__ = []
    __user_inputs__ = user_inputs if user_inputs else []
    __input_index__ = 0
    
    old_stdout = sys.stdout
    sys.stdout = __stdout_capture__
    
    compiled = compile(code_string, __user_code_filename__, 'exec')
    exec_globals = {
        '__name__': '__main__',
        '__builtins__': __builtins__,
        'input': __custom_input__
    }
    
    sys.settrace(__trace_function__)
    error_message = None
    try:
        exec(compiled, exec_globals)
    except ExecutionLimitExceeded as e:
        error_message = str(e)
    except Exception as e:
        error_message = f"{type(e).__name__}: {str(e)}"
    finally:
        sys.settrace(None)
        final_output = __get_new_stdout__()
        if final_output and __trace_data__:
            __trace_data__[-1]['stdout'] = __trace_data__[-1].get('stdout', '') + final_output
        sys.stdout = old_stdout
    
    print(__stdout_capture__.getvalue(), end='')
    return json.dumps({
        'trace': __trace_data__,
        'error': error_message
    })

__result__ = __run_with_trace__(USER_CODE_HERE, USER_INPUTS_HERE)
__result__
`;

function wrapWithTracer(userCode, userInputs = []) {
    const escapedCode = userCode
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n');

    const inputsList = JSON.stringify(userInputs);
    const pythonCodeLiteral = `"${escapedCode}"`;

    return TRACER_SCRIPT
        .replace('USER_CODE_HERE', pythonCodeLiteral)
        .replace('USER_INPUTS_HERE', inputsList);
}

self.onmessage = async (e) => {
    const { type, code, inputs } = e.data;

    if (type === 'INIT') {
        try {
            if (!pyodide) {
                pyodide = await loadPyodide();
            }
            self.postMessage({ type: 'READY' });
        } catch (err) {
            self.postMessage({ type: 'ERROR', message: err.message });
        }
    } else if (type === 'RUN') {
        try {
            if (!pyodide) {
                pyodide = await loadPyodide();
            }

            // Redirect stdout/stderr (although tracer captures most of it)
            // We can also let the tracer handle custom stdout logic

            const tracedCode = wrapWithTracer(code, inputs);
            const result = await pyodide.runPythonAsync(tracedCode);

            // result is the JSON string returned by __run_with_trace__
            self.postMessage({ type: 'SUCCESS', result });
        } catch (err) {
            self.postMessage({ type: 'ERROR', message: err.message });
        }
    }
};
