import {
  createUser,
  createSeller,
  findUserByEmail,
  findUserById,
  updateUserDetails,
  findAuthById,
  updatePassword,
} from "../services/user.service.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { saveRefreshToken } from "../services/refresh.service.js";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number and special character";

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
      });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email: normalizedEmail,
      hashedPassword,
    });
    res.status(201).json({ message: "User created", data: user });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }
    next(err);
  }
};

export const registerSeller = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: passwordMessage,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createSeller({
      name,
      email: normalizedEmail,
      hashedPassword,
      role: "seller",
    });
    res.status(201).json({ message: "Seller created", data: user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validatePassword = await bcrypt.compare(password, user.password);

    if (!validatePassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(refreshToken, user.id, expiresAt);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getprofile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profileDetails = await findUserById(userId);
    if (!profileDetails) throw new Error("Profile not found");
    return res
      .status(200)
      .json({ message: "profile fetched successfully", data: profileDetails });
  } catch (error) {
    next(error);
  }
};

export const editProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, oldPassword, newPassword } = req.body;

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ message: "old password is required" });
      }
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: passwordMessage });
      }
      const auth = await findAuthById(userId);
      if (!auth || !(await bcrypt.compare(oldPassword, auth.password))) {
        return res.status(401).json({ message: "Old password is incorrect" });
      }
    }

    const fields = {};
    if (name) fields.name = name;
    if (email) fields.email = email;

    if (!Object.keys(fields).length && !newPassword) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let user = Object.keys(fields).length
      ? await updateUserDetails(userId, fields)
      : await findUserById(userId);

   
    if (newPassword) {
      await updatePassword(userId, await bcrypt.hash(newPassword, 12));
     
    }

    res
      .status(200)
      .json({ message: "Profile updated successfully", data: user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }
    next(error);
  }
};
