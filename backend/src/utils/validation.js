/**
 * Validation Utility
 * Provides input validation functions for API requests
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateTunesianPhone = (phone) => {
  // Tunisian phone: +216 20/21/22/50/51/52/53/54/55/56/57/58/59 XXXXXXXX
  const phoneRegex = /^(\+216|0)?[259]\d{7}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const validateTunesianRIB = (rib) => {
  // RIB: TN59 XXXX XXXX XXXX XXXX XXXX XX
  const ribRegex = /^TN\d{24}$/;
  return ribRegex.test(rib.replace(/\s/g, ''));
};

const validateTunesianIBAN = (iban) => {
  // IBAN: TN59 XXXX XXXX XXXX XXXX XXXX XX
  const ibanRegex = /^TN\d{24}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
};

const validateCIN = (cin) => {
  // Tunisian CIN: 8 digits
  const cinRegex = /^\d{8}$/;
  return cinRegex.test(cin);
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

const validateString = (str, minLength = 1, maxLength = 255) => {
  if (typeof str !== 'string') return false;
  const length = str.trim().length;
  return length >= minLength && length <= maxLength;
};

const validateObject = (obj, requiredFields = []) => {
  if (typeof obj !== 'object' || obj === null) return false;
  return requiredFields.every((field) => field in obj);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  validateEmail,
  validatePassword,
  validateTunesianPhone,
  validateTunesianRIB,
  validateTunesianIBAN,
  validateCIN,
  validateAmount,
  validateString,
  validateObject,
  sanitizeInput
};
