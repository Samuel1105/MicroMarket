import bycrypt from "bcrypt";

export const hashPassword = async (password: string) => {
  const salt = await bycrypt.genSalt(10);

  return await bycrypt.hash(password, salt);
};

export const checkPassword = async (
  enteredPassword: string,
  storedHash: string,
) => {
  return await bycrypt.compare(enteredPassword, storedHash);
};
