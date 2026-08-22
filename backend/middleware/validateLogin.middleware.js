const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    return res.status(400).json({
      message: "Please provide a valid email",
    });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({
      message: "Password is required",
    });
  }
  next();
};

export default validateLogin;