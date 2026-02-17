export default function Toast({ message, type = "success", visible }) {
  if (!message) return null;

  return (
    <div className={`toast ${type} ${visible ? "show" : ""}`}>{message}</div>
  );
}
