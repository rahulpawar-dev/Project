const ALLOWED_PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'wallet'];

const normalizePayment = (payment = {}, fallbackAmount = 0) => {
  const parsedAmount = Number(payment?.amount);
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : Number(fallbackAmount) || 0;
  const paidAtValue = payment?.paidAt ? new Date(payment.paidAt) : null;
  const paidAt = paidAtValue && !Number.isNaN(paidAtValue.getTime()) ? paidAtValue : null;

  return {
    method: String(payment?.method || '').trim().toLowerCase(),
    amount: Math.max(amount, 0),
    currency: String(payment?.currency || 'INR').trim().toUpperCase() || 'INR',
    status: String(payment?.status || 'pending').trim().toLowerCase(),
    transactionId: String(payment?.transactionId || '').trim(),
    paidAt,
    payerReference: String(payment?.payerReference || '').trim(),
  };
};

const validatePaidPayment = (payment, options = {}) => {
  const { minAmount = 1 } = options;

  if (!payment || typeof payment !== 'object') {
    return { isValid: false, message: 'Payment details are required before proceeding.' };
  }

  if (payment.status !== 'paid') {
    return { isValid: false, message: 'Please complete payment before proceeding.' };
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(payment.method)) {
    return { isValid: false, message: 'Please select a valid payment method.' };
  }

  if (!Number.isFinite(payment.amount) || payment.amount < minAmount) {
    return { isValid: false, message: 'Invalid payment amount.' };
  }

  if (!payment.transactionId) {
    return { isValid: false, message: 'Payment transaction is missing. Please retry payment.' };
  }

  if (!payment.paidAt || Number.isNaN(new Date(payment.paidAt).getTime())) {
    return { isValid: false, message: 'Payment timestamp is invalid. Please retry payment.' };
  }

  return { isValid: true, message: '' };
};

module.exports = {
  ALLOWED_PAYMENT_METHODS,
  normalizePayment,
  validatePaidPayment,
};
