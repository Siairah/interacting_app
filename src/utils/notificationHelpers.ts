export function getNotificationIcon(type: string): string {
  switch (type) {
    case "like":
      return "fas fa-heart";
    case "comment":
      return "fas fa-comment";
    case "ban":
      return "fas fa-ban";
    case "restriction":
      return "fas fa-user-lock";
    case "approval":
      return "fas fa-check-circle";
    case "rejection":
      return "fas fa-times-circle";
    case "post_approved":
      return "fas fa-check";
    case "post_removed":
      return "fas fa-trash";
    case "post_reported":
      return "fas fa-flag";
    case "flagged":
      return "fas fa-exclamation-triangle";
    case "post_flagged_auto":
      return "fas fa-flag";
    case "warning":
      return "fas fa-exclamation-circle";
    case "join_request":
      return "fas fa-user-plus";
    case "new_post":
      return "fas fa-file-alt";
    case "unban":
      return "fas fa-unlock";
    default:
      return "fas fa-bell";
  }
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
