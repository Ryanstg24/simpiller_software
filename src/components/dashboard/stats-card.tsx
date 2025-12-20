import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
}

export function StatsCard({ title, value, icon: Icon, iconColor, iconBgColor, change }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-800">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <span className={`text-sm font-medium ${
                change.type === "increase" ? "text-green-600" : "text-red-600"
              }`}>
                {change.type === "increase" ? "+" : "-"}{change.value}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 