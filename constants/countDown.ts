import { useEffect, useState } from "react";

export const useCountdown = (expiryTime: string, onlyTime: boolean = false) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const target = new Date(expiryTime).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = onlyTime
        ? Math.floor(diff / (1000 * 60 * 60))
        : Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (onlyTime) {
        setTimeLeft(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      } else {
        setTimeLeft(`${days > 0 ? days + ' hari' : ''} ${hours > 0 ? hours + ' jam' : ''} ${minutes > 0 ? minutes + ' menit' : ''} ${seconds > 0 ? seconds + ' detik' : ''} `);
      }


    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  return timeLeft;
};

export const formatWaktu = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    timeZone: dateString?.includes(":23+00") ? "UTC" : "Asia/Makassar",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
export const formatTanggal = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    timeZone: dateString?.includes(":23+00") ? "UTC" : "Asia/Makassar",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};