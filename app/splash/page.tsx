"use client";

import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";

export default function SplashPage() {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLeaving(true), 40000);
    return () => clearTimeout(timer);
  }, []);

  return <SplashScreen isLeaving={isLeaving} />;
}
