export const normalizePermissionFlags = (permission = {}) => {
  const view = Boolean(permission.view);
  const add = Boolean(permission.add);
  const edit = Boolean(permission.edit);
  const del = Boolean(permission.delete);

  return {
    view: view || add || edit || del,
    add: add || edit || del,
    edit: edit || del,
    delete: del,
  };
};

export const normalizePermissionRecord = (permission = {}) => {
  const flags = normalizePermissionFlags(permission);
  return {
    ...permission,
    ...flags,
  };
};
