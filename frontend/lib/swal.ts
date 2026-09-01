// Safe dynamic getter for SweetAlert2 on client side (SSR-safe for Next.js)
export const getSwal = async () => {
  if (typeof window === 'undefined') return null;
  const Swal = (await import('sweetalert2')).default;
  return Swal.mixin({
    position: 'center',
    background: '#FFFFFF',
    color: '#142733',
    customClass: {
      container: 'z-[999999]',
      popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-morning-200 text-sapphire-900',
      title: 'text-base md:text-lg font-extrabold text-sapphire-900',
      htmlContainer: 'text-xs md:text-sm text-sage-700 font-medium',
      confirmButton: 'px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md transition mx-1.5',
      cancelButton: 'px-5 py-2.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-bold text-xs transition mx-1.5',
    },
    buttonsStyling: false,
  });
};

/**
 * Notificare Succes (Centrată pe ecran)
 */
export const showSuccess = async (title: string, htmlOrText?: string) => {
  const swal = await getSwal();
  if (!swal) return;
  return swal.fire({
    icon: 'success',
    title,
    html: htmlOrText,
    confirmButtonText: 'Închide',
    customClass: {
      container: 'z-[999999]',
      popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-emerald-200 text-sapphire-900',
      title: 'text-base md:text-lg font-extrabold text-sapphire-900',
      htmlContainer: 'text-xs md:text-sm text-slate-700 font-medium',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition',
    },
  });
};

/**
 * Notificare Eroare (Centrată pe ecran)
 */
export const showError = async (title: string, htmlOrText?: string) => {
  const swal = await getSwal();
  if (!swal) return;
  return swal.fire({
    icon: 'error',
    title,
    html: htmlOrText,
    confirmButtonText: 'Am înțeles',
    customClass: {
      container: 'z-[999999]',
      popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-rose-200 text-sapphire-900',
      title: 'text-base md:text-lg font-extrabold text-rose-950',
      htmlContainer: 'text-xs md:text-sm text-rose-800 font-medium',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition',
    },
  });
};

/**
 * Notificare Avertizare (Centrată pe ecran)
 */
export const showWarning = async (title: string, htmlOrText?: string) => {
  const swal = await getSwal();
  if (!swal) return;
  return swal.fire({
    icon: 'warning',
    title,
    html: htmlOrText,
    confirmButtonText: 'Continuă',
    customClass: {
      container: 'z-[999999]',
      popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-amber-200 text-sapphire-900',
      title: 'text-base md:text-lg font-extrabold text-amber-950',
      htmlContainer: 'text-xs md:text-sm text-amber-800 font-medium',
      confirmButton: 'px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition',
    },
  });
};

/**
 * Dialog de Confirmare (Da / Nu) Centrat pe Ecran
 */
export const showConfirm = async (
  title: string,
  text: string,
  confirmButtonText = 'Da, confirmă',
  cancelButtonText = 'Anulează',
  icon: any = 'warning'
) => {
  const swal = await getSwal();
  if (!swal) return false;
  const result = await swal.fire({
    title,
    html: text.replace(/\n/g, '<br/>'),
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      container: 'z-[999999]',
      popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-morning-200 text-sapphire-900',
      title: 'text-base md:text-lg font-extrabold text-sapphire-900',
      htmlContainer: 'text-xs md:text-sm text-sage-700 font-medium',
      confirmButton: 'px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md transition mx-1.5 cursor-pointer',
      cancelButton: 'px-5 py-2.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-bold text-xs transition mx-1.5 cursor-pointer',
    },
  });

  return result.isConfirmed;
};

/**
 * Inițializare Globală: Înlocuiește window.alert nativ cu SweetAlert2 centrat pe mijlocul ecranului
 */
export const initSweetAlert = async () => {
  if (typeof window === 'undefined') return;
  const swal = await getSwal();
  if (!swal) return;

  window.alert = (message?: any) => {
    const msg = String(message ?? '');
    const isError = /eroare|error|invalid|fail|greșit|eșuat/i.test(msg);
    const isSuccess = /✅|succes|salvat|adăugat|modificat|actualizat|importat/i.test(msg);
    const isWarning = /⚠️|atenție|avertisment|prag/i.test(msg);

    let icon: any = 'info';
    let title = 'Notificare Sistem';

    if (isError) {
      icon = 'error';
      title = 'Eroare';
    } else if (isSuccess) {
      icon = 'success';
      title = 'Succes';
    } else if (isWarning) {
      icon = 'warning';
      title = 'Atenție';
    }

    swal.fire({
      icon,
      title,
      html: msg.replace(/\n/g, '<br/>'),
      confirmButtonText: 'Închide',
      customClass: {
        container: 'z-[999999]',
        popup: 'pleasant-card rounded-2xl p-6 shadow-2xl border border-morning-200 text-sapphire-900',
        title: 'text-base md:text-lg font-extrabold text-sapphire-900',
        htmlContainer: 'text-xs md:text-sm text-sage-700 font-medium',
        confirmButton: 'px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md transition mx-1.5',
      },
    });
  };
};
