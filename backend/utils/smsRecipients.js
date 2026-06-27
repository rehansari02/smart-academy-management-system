const normalizeMobile = (value) => String(value || '').replace(/\D/g, '').slice(-10);

const getParentSmsRecipients = (student) => {
    const mobile = normalizeMobile(student?.mobileParent || student?.contactParent);
    return mobile ? [mobile] : [];
};

module.exports = {
    getParentSmsRecipients
};
