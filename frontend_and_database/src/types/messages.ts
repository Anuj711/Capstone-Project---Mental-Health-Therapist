export type Message = {
  role: "user" | "assistant";
  text: string;
  timestamp: any; // or Timestamp from Firestore
  userId: string;
};
