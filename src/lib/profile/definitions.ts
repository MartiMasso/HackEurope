export const PROFILE_FIELDS = [
  { key: "name", label: "Full name", placeholder: "Jane Doe" },
  { key: "email", label: "Email", placeholder: "jane@example.com" },
  { key: "address", label: "Address", placeholder: "123 Main St, City" },
  { key: "phone", label: "Phone", placeholder: "+1 555 000 000" },
  { key: "school", label: "School", placeholder: "Example University" },
  { key: "major", label: "Major", placeholder: "Computer Science" },
  { key: "gpa", label: "GPA", placeholder: "3.8" },
  { key: "toefl_total", label: "TOEFL total", placeholder: "105" },
  { key: "toefl_reading", label: "TOEFL reading", placeholder: "28" },
  { key: "toefl_listening", label: "TOEFL listening", placeholder: "27" },
  { key: "toefl_speaking", label: "TOEFL speaking", placeholder: "25" },
  { key: "toefl_writing", label: "TOEFL writing", placeholder: "25" }
] as const;

export const PROFILE_COMPLETION_KEYS = [
  "name",
  "email",
  "address",
  "school",
  "gpa",
  "toefl_total"
] as const;
