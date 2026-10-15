export function loadScript(src: string, data: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    Object.assign(script.dataset, data);
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`could not load ${src}`)));
    script.src = src;
    document.head.append(script);
  });
}
