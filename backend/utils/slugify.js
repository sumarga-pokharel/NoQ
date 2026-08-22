import Provider from '../models/Provider.js';

export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'office';

// Ensures the slug is unique by appending -2, -3, ... if needed
export const uniqueSlug = async (base) => {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Provider.exists({ slug: candidate })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
};
