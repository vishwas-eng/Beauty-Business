import { AlertTriangle, Siren, Sparkles } from "lucide-react";
import { AlertItem } from "../types/domain";

const iconMap = {
  warning: AlertTriangle,
  danger: Siren,
  info: Sparkles
};

export function AlertBanner({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="alert-stack">
      {alerts.map((alert) => {
        const Icon = iconMap[alert.tone];
        return (
          <div key={alert.id} className={`alert-banner tone-${alert.tone}`}>
            <Icon size={18} />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
