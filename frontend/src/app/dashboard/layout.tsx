import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Bu layout bloğu "/dashboard" altındaki TÜM sayfalara Header ve Sidebar'ı ekler.
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
