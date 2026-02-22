type ToastProps = {
  message: string;
  type?: "success" | "error";
  visible: boolean;
};

export default function Toast({
  message,
  type = "success",
  visible,
}: ToastProps) {
  if (!message) return null;

  return (
    <div className={`toast ${type} ${visible ? "show" : ""}`}>{message}</div>
  );
}
