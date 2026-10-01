import type { DeepStringify } from "../types";

// Russian is the source of truth for the key structure; Uzbek must mirror it.
export const ru = {
  metaTitle: "Вход | Velmora Kids",
  metaDescription: "Войдите в свой аккаунт Velmora Kids",
  favoriteAdded: "Товар добавлен в избранное",
  forgot: {
    title: "Восстановление пароля",
    subtitle: "Введите email для получения инструкций",
    sent: "Если аккаунт с таким email существует, мы отправили инструкции по восстановлению пароля.",
    backToLogin: "Вернуться к входу",
    send: "Отправить",
  },
  validation: {
    firstNameRequired: "Введите имя",
    lastNameRequired: "Введите фамилию",
    phoneInvalid: "Введите корректный номер телефона",
    passwordMin8: "Пароль должен содержать минимум 8 символов",
    termsRequired: "Необходимо принять условия",
  },
  registerError: "Ошибка регистрации. Попробуйте снова.",
  strength: {
    minLength: "Минимум 8 символов",
    hasNumber: "Содержит цифру",
    hasLetter: "Содержит букву",
  },
  addressOptional: "Адрес доставки (необязательно)",
  agreeBefore: "Я согласен с",
  agreeTerms: "условиями использования",
  agreeAnd: "и",
  agreePrivacy: "политикой конфиденциальности",
  agreeAfter: "",
} as const satisfies Record<string, unknown>;

export const uz: DeepStringify<typeof ru> = {
  metaTitle: "Kirish | Velmora Kids",
  metaDescription: "Velmora Kids hisobingizga kiring",
  favoriteAdded: "Mahsulot sevimlilarga qo'shildi",
  forgot: {
    title: "Parolni tiklash",
    subtitle: "Ko'rsatmalarni olish uchun email kiriting",
    sent: "Agar bunday email bilan hisob mavjud bo'lsa, parolni tiklash bo'yicha ko'rsatmalarni yubordik.",
    backToLogin: "Kirish sahifasiga qaytish",
    send: "Yuborish",
  },
  validation: {
    firstNameRequired: "Ismingizni kiriting",
    lastNameRequired: "Familiyangizni kiriting",
    phoneInvalid: "To'g'ri telefon raqamini kiriting",
    passwordMin8: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
    termsRequired: "Shartlarni qabul qilish zarur",
  },
  registerError: "Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring.",
  strength: {
    minLength: "Kamida 8 ta belgi",
    hasNumber: "Raqam mavjud",
    hasLetter: "Harf mavjud",
  },
  addressOptional: "Yetkazib berish manzili (ixtiyoriy)",
  agreeBefore: "",
  agreeTerms: "Foydalanish shartlari",
  agreeAnd: "va",
  agreePrivacy: "maxfiylik siyosatiga",
  agreeAfter: "roziman",
};
