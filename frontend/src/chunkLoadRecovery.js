const RELOAD_FLAG = "lms:chunk-reload-attempted";

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Expected a JavaScript-or-Wasm module script/i,
  /MIME type of ["']text\/html["']/i,
];

const getErrorMessage = (eventOrError) => {
  const reason = eventOrError?.reason;
  const error = eventOrError?.error;

  return [
    eventOrError?.message,
    reason?.message,
    error?.message,
    typeof reason === "string" ? reason : "",
    typeof error === "string" ? error : "",
    String(eventOrError || ""),
  ]
    .filter(Boolean)
    .join(" ");
};

const isChunkLoadError = (eventOrError) => {
  const message = getErrorMessage(eventOrError);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

const reloadOnce = () => {
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    return false;
  }

  sessionStorage.setItem(RELOAD_FLAG, "1");
  window.location.reload();
  return true;
};

export const registerChunkLoadRecovery = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event)) {
      return;
    }

    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener(
    "error",
    (event) => {
      if (!isChunkLoadError(event)) {
        return;
      }

      event.preventDefault();
      reloadOnce();
    },
    true
  );

  window.addEventListener("load", () => {
    setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 5000);
  });
};
