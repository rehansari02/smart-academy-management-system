import Swal from 'sweetalert2';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const confirmTypedDelete = async ({
  itemName,
  itemType = 'record',
  details = [],
  finalWarning = 'This action cannot be undone.',
}) => {
  const nameToType = String(itemName || '').trim();

  if (!nameToType) {
    await Swal.fire({
      title: 'Delete blocked',
      text: `Cannot delete this ${itemType} because its name is missing.`,
      icon: 'error',
      confirmButtonColor: '#dc2626',
    });
    return false;
  }

  const safeName = escapeHtml(nameToType);
  const detailHtml = details
    .filter(Boolean)
    .map((detail) => `<p class="text-xs text-gray-500">${escapeHtml(detail)}</p>`)
    .join('');

  const steps = [
    {
      title: 'First Confirmation',
      text: `Are you sure you want to delete this ${itemType}?`,
      button: 'Yes, Continue',
    },
    {
      title: 'Second Confirmation',
      text: finalWarning,
      button: 'Yes, I Understand',
    },
    {
      title: 'Final Confirmation',
      text: `After this step you must type the exact ${itemType} name to delete it.`,
      button: 'Next - Type Name',
    },
  ];

  for (const [index, step] of steps.entries()) {
    const progressHtml = `
      <div class="mb-4">
        <div class="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>Confirmation Progress</span>
          <span>Step ${index + 1} of ${steps.length}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          ${steps.map((_, stepIndex) => `
            <div class="h-2 rounded-full ${stepIndex <= index ? 'bg-red-500' : 'bg-gray-200'}"></div>
          `).join('')}
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: step.title,
      html: `
        <div class="text-left">
          ${progressHtml}
          <p class="text-sm text-gray-700">${escapeHtml(step.text)}</p>
          <div class="mt-3 rounded border border-red-200 bg-red-50 p-3">
            <p class="text-sm font-semibold text-red-800">${safeName}</p>
            ${detailHtml}
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: step.button,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      allowOutsideClick: false,
    });

    if (!result.isConfirmed) return false;
  }

  const typedResult = await Swal.fire({
    title: 'Type Name to Confirm',
    html: `
      <div class="text-left">
        <div class="mb-4">
          <div class="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Confirmation Progress</span>
            <span>Final Step</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="h-2 rounded-full bg-red-500"></div>
            <div class="h-2 rounded-full bg-red-500"></div>
            <div class="h-2 rounded-full bg-red-500"></div>
          </div>
        </div>
        <p class="text-sm text-gray-700">Type the exact name below to permanently delete this ${escapeHtml(itemType)}.</p>
        <p class="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">${safeName}</p>
      </div>
    `,
    icon: 'error',
    input: 'text',
    inputPlaceholder: nameToType,
    showCancelButton: true,
    confirmButtonText: `Delete ${itemType}`,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    allowOutsideClick: false,
    inputValidator: (value) => {
      if (String(value || '').trim() !== nameToType) {
        return `Type exact name: ${nameToType}`;
      }
      return undefined;
    },
  });

  return typedResult.isConfirmed;
};
