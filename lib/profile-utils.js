const bcrypt = require('bcryptjs');
const saltRounds = process.env.NODE_ENV == 'test' ? 5 : 12;

const encodePassword = async input => {
  const salt = await bcrypt.genSalt(saltRounds);

  return await bcrypt.hash(input, salt);
};

module.exports = { encodePassword };
