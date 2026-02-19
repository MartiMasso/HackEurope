import type { ExtractedField } from "@/lib/types";

type ExtractInput = {
  documentType: string;
  fileUrl: string;
  filename: string;
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

function pickFrom<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

export async function extractFieldsFromDocument({
  documentType,
  fileUrl,
  filename
}: ExtractInput): Promise<ExtractedField[]> {
  // Simulate an async extraction boundary. Replace with OCR/LLM pipeline later.
  await Promise.resolve();

  const seed = hashString(`${documentType}:${filename}:${fileUrl}`);
  const normalized = `${documentType} ${filename}`.toLowerCase();

  const names = ["Alex Morgan", "Jamie Chen", "Taylor Rivera", "Jordan Silva"];
  const schools = [
    "Westbridge University",
    "Northfield College",
    "Lakeside Institute",
    "Metro Technical University"
  ];
  const addresses = [
    "742 Evergreen Terrace, Springfield",
    "55 Oak Street, Austin",
    "900 Harbor Ave, Seattle",
    "17 Park Lane, Boston"
  ];

  const base: ExtractedField[] = [
    {
      key: "name",
      value: pickFrom(names, seed),
      confidence: 0.94,
      sourcePage: 1
    },
    {
      key: "address",
      value: pickFrom(addresses, seed + 1),
      confidence: 0.82,
      sourcePage: 1
    }
  ];

  if (normalized.includes("transcript") || normalized.includes("academic")) {
    base.push(
      {
        key: "school",
        value: pickFrom(schools, seed + 2),
        confidence: 0.97,
        sourcePage: 1
      },
      {
        key: "gpa",
        value: `${(3.2 + ((seed % 10) / 10)).toFixed(2)}`,
        confidence: 0.9,
        sourcePage: 1
      }
    );
  }

  if (normalized.includes("toefl") || normalized.includes("english")) {
    const total = 92 + (seed % 20);
    base.push(
      {
        key: "toefl_total",
        value: `${total}`,
        confidence: 0.95,
        sourcePage: 1
      },
      {
        key: "toefl_reading",
        value: `${22 + (seed % 8)}`,
        confidence: 0.84,
        sourcePage: 2
      },
      {
        key: "toefl_listening",
        value: `${22 + ((seed + 1) % 8)}`,
        confidence: 0.84,
        sourcePage: 2
      },
      {
        key: "toefl_speaking",
        value: `${21 + ((seed + 2) % 9)}`,
        confidence: 0.84,
        sourcePage: 2
      },
      {
        key: "toefl_writing",
        value: `${21 + ((seed + 3) % 9)}`,
        confidence: 0.84,
        sourcePage: 2
      }
    );
  }

  if (normalized.includes("id") || normalized.includes("passport")) {
    base.push(
      {
        key: "email",
        value: `applicant${(seed % 89) + 10}@example.com`,
        confidence: 0.78,
        sourcePage: 1
      },
      {
        key: "phone",
        value: `+1-555-${(1000 + (seed % 9000)).toString()}`,
        confidence: 0.75,
        sourcePage: 1
      }
    );
  }

  return base;
}
