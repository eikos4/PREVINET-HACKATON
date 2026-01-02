import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OnlineStatus() {
  const online = useOnlineStatus();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: online ? "#166534" : "#991b1b",
        background: online ? "#dcfce7" : "#fee2e2",
        padding: "0.4rem 0.7rem",
        borderRadius: "999px",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: online ? "#22c55e" : "#ef4444",
        }}
      />
      {online ? "Online" : "Offline"}
    </div>
  );
}
