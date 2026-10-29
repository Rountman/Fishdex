import { useEffect, useRef } from 'react';

/**
 * Drives a native <dialog> as a modal from React state: showModal() gives focus
 * trapping, Esc and focus return for free. `onClose` fires for Esc, backdrop
 * click and form/button closes, so React state follows the dialog.
 */
export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onDialogClose = () => close.current();
    // click on the backdrop = click on the dialog element itself
    const onClick = (e: MouseEvent) => { if (e.target === d) d.close(); };
    d.addEventListener('close', onDialogClose);
    d.addEventListener('click', onClick);
    return () => { d.removeEventListener('close', onDialogClose); d.removeEventListener('click', onClick); };
  }, []);

  return ref;
}
