/**
 * Shared Mongoose toJSON/toObject options: the API sends `id` (string) instead of `_id`
 * and never sends `__v` or secrets.
 */
export const cleanJSON = (extra = () => {}) => ({
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    extra(ret);
    return ret;
  },
});
