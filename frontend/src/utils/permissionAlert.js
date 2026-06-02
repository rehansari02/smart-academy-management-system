import Swal from 'sweetalert2';

export const showPermissionDenied = (message) => {
  return Swal.fire({
    title: 'Access Denied',
    text: message || "You don't have authority for this permission.",
    icon: 'error',
    confirmButtonColor: '#d33',
  });
};
