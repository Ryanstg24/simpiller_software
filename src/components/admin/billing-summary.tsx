import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Building2, Users, TrendingUp } from "lucide-react";
import { useBillingAnalytics } from "@/hooks/use-billing-analytics";

export function BillingSummary() {
  const { data, loading, error } = useBillingAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading billing data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      title: "Total Organizations",
      value: data.totalOrganizations.toLocaleString(),
      icon: Building2,
      color: "text-blue-600",
      subtitle: "Active organizations"
    },
    {
      title: "Total Patients",
      value: data.totalPatients.toLocaleString(),
      icon: Users,
      color: "text-green-600",
      subtitle: "Across all organizations"
    },
    {
      title: "Monthly Revenue",
      value: `$${data.totalMonthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-600",
      subtitle: "Recurring monthly"
    },
    {
      title: "Total Revenue",
      value: `$${data.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-orange-600",
      subtitle: "Setup + Monthly fees"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.subtitle}</p>
                </div>
                <Icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 