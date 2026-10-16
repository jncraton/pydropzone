import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs'

let pyodidePromise
let pendingInput = null

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/',
    })
  }

  return pyodidePromise
}

self.onmessage = async event => {
  const { type, text } = event.data

  if (type === 'input-response') {
    const resolve = pendingInput
    pendingInput = null
    if (resolve) resolve(text)
    return
  }

  if (type !== 'run') return

  try {
    const pyodide = await getPyodide()

    pyodide.globals.set('_emit', value => {
      self.postMessage({ type: 'output', text: String(value) })
    })

    pyodide.globals.set(
      '_read_line',
      () =>
        new Promise(resolve => {
          pendingInput = resolve
          self.postMessage({ type: 'input-request' })
        }),
    )

    await pyodide.runPythonAsync(text)
    self.postMessage({ type: 'finished' })
  } catch (error) {
    self.postMessage({ type: 'error', text: String(error) })
  }
}
