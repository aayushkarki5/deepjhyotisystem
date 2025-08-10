// utils/responseHelper.js
// Small helper to standardize API responses across controllers.

const getPaginationMeta = (page = 1, limit = 10, totalCount = 0) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 10);
  const totalPages = Math.ceil((Number(totalCount) || 0) / l);
  return {
    pagination: {
      currentPage: p,
      totalPages,
      totalCount: Number(totalCount) || 0,
      limit: l,
      hasNext: p < totalPages,
      hasPrev: p > 1
    }
  };
};

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data = null, message = 'Created') => success(res, data, message, 201);

const fail = (res, message = 'Failure', statusCode = 400, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) });

const serverError = (res, message = 'Server error') => fail(res, message, 500);

const paginated = (res, data = [], page = 1, limit = 10, totalCount = 0, message = 'Success') =>
  res.status(200).json({ success: true, message, data, ...getPaginationMeta(page, limit, totalCount) });

module.exports = {
  success,
  created,
  fail,
  serverError,
  paginated,
  getPaginationMeta
};
