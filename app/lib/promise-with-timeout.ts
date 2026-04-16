const DEFAULT_TIMEOUT_MS = 20000;

export class PromiseTimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'PromiseTimeoutError';
  }
}

export function withPromiseTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  message = 'Operation timed out',
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new PromiseTimeoutError(message)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
