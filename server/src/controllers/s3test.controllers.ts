import express from "express";
import upload from "../middleware/upload";

const router = express.Router();

router.post(
  "/profile-image",
  upload.single("image"),
  async (req: any, res) => {
    try {
      return res.status(200).json({
        success: true,
        imageUrl: req.file.location,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Upload failed",
      });
    }
  }
);

export default router;