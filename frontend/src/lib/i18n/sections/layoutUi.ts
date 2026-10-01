import type { DeepStringify } from "../types";

// Russian is the source of truth for the key structure; Uzbek must mirror it.
export const ru = {
  bottomNav: {
    home: "Главная",
    account: "Кабинет",
  },
  address: "г. Ташкент, ул. Амира Темура, 107",
} as const satisfies Record<string, unknown>;

export const uz: DeepStringify<typeof ru> = {
  bottomNav: {
    home: "Bosh sahifa",
    account: "Kabinet",
  },
  address: "Toshkent sh., Amir Temur ko'chasi, 107",
};
