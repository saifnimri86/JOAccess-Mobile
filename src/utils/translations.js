/**
 * Bilingual Translations (English / Arabic)
 * ==========================================
 * Every user-facing string in the app lives here.
 * Components call useLanguage().t('key') to get the correct translation.
 */

const translations = {
  // ── App-wide ──
  appName: { en: 'JOAccess', ar: 'JOAccess' },
  tagline: {
    en: 'Accessibility Map Jordan',
    ar: 'خريطة الوصول الأردن',
  },

  // ── Navigation / Tabs ──
  tabMap: { en: 'Map', ar: 'الخريطة' },
  tabProfile: { en: 'Profile', ar: 'الملف الشخصي' },
  tabChat: { en: 'Assistant', ar: 'المساعد' },
  tabSettings: { en: 'Settings', ar: 'الإعدادات' },

  // ── Auth ──
  login: { en: 'Login', ar: 'تسجيل الدخول' },
  signup: { en: 'Sign Up', ar: 'إنشاء حساب' },
  logout: { en: 'Logout', ar: 'تسجيل الخروج' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  password: { en: 'Password', ar: 'كلمة المرور' },
  username: { en: 'Username', ar: 'اسم المستخدم' },
  loginSubtitle: {
    en: 'Welcome back to JOAccess',
    ar: 'مرحباً بعودتك إلى JOAccess',
  },
  signupSubtitle: {
    en: 'Join the accessibility community',
    ar: 'انضم إلى مجتمع الوصول',
  },
  noAccount: {
    en: "Don't have an account?",
    ar: 'ليس لديك حساب؟',
  },
  hasAccount: {
    en: 'Already have an account?',
    ar: 'لديك حساب بالفعل؟',
  },
  emailRequired: {
    en: 'Email is required',
    ar: 'البريد الإلكتروني مطلوب',
  },
  passwordRequired: {
    en: 'Password is required',
    ar: 'كلمة المرور مطلوبة',
  },
  passwordMinLength: {
    en: 'Password must be at least 6 characters',
    ar: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
  },
  usernameRequired: {
    en: 'Username is required',
    ar: 'اسم المستخدم مطلوب',
  },
  invalidCredentials: {
    en: 'Invalid email or password',
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة',
  },
  emailTaken: {
    en: 'Email already registered',
    ar: 'البريد الإلكتروني مسجل بالفعل',
  },
  usernameTaken: {
    en: 'Username already taken',
    ar: 'اسم المستخدم مستخدم بالفعل',
  },
  signupSuccess: {
    en: 'Account created! Please login.',
    ar: 'تم إنشاء الحساب! يرجى تسجيل الدخول.',
  },

  // ── User Type ──
  userType: { en: 'Account Type', ar: 'نوع الحساب' },
  individual: { en: 'Individual', ar: 'فرد' },
  organization: { en: 'Organization', ar: 'منظمة' },
  organizationName: { en: 'Organization Name', ar: 'اسم المنظمة' },
  disability: { en: 'Disability (optional)', ar: 'الإعاقة (اختياري)' },

  // ── Map ──
  searchLocations: { en: 'Search locations...', ar: 'ابحث عن الأماكن...' },
  filters: { en: 'Filters', ar: 'التصفية' },
  categories: { en: 'Categories', ar: 'الفئات' },
  accessibilityFeatures: { en: 'Accessibility Features', ar: 'ميزات الوصول' },
  verified: { en: 'Verified', ar: 'موثق' },
  unverified: { en: 'Unverified', ar: 'غير موثق' },
  description: { en: 'Description', ar: 'الوصف' },
  address: { en: 'Address', ar: 'العنوان' },
  rating: { en: 'Rating', ar: 'التقييم' },
  reviews: { en: 'reviews', ar: 'تقييم' },
  photos: { en: 'Photos', ar: 'الصور' },
  noLocations: { en: 'No locations found', ar: 'لا توجد مواقع' },
  loadingLocations: { en: 'Loading locations...', ar: 'جارٍ تحميل المواقع...' },
  myLocation: { en: 'My Location', ar: 'موقعي' },
  applyFilters: { en: 'Apply Filters', ar: 'تطبيق التصفية' },
  clearFilters: { en: 'Clear All', ar: 'مسح الكل' },

  // ── Location Details ──
  rateLocation: { en: 'Rate Location', ar: 'قيّم الموقع' },
  reportLocation: { en: 'Report Location', ar: 'الإبلاغ عن الموقع' },
  addReview: { en: 'Add Review', ar: 'أضف تقييم' },
  submitRating: { en: 'Submit Rating', ar: 'إرسال التقييم' },
  addComment: { en: 'Add a comment (optional)...', ar: 'أضف تعليقاً (اختياري)...' },
  reportReason: { en: 'Reason for reporting', ar: 'سبب الإبلاغ' },
  reportDescription: { en: 'Additional details (optional)...', ar: 'تفاصيل إضافية (اختياري)...' },
  submitReport: { en: 'Submit Report', ar: 'إرسال البلاغ' },
  inaccurateInfo: { en: 'Inaccurate Information', ar: 'معلومات غير دقيقة' },
  closedLocation: { en: 'Location Closed/Moved', ar: 'الموقع مغلق/انتقل' },
  inappropriate: { en: 'Inappropriate Content', ar: 'محتوى غير لائق' },
  safetyIssue: { en: 'Safety Issue', ar: 'مشكلة أمان' },
  other: { en: 'Other', ar: 'أخرى' },
  directions: { en: 'Directions', ar: 'الاتجاهات' },

  // ── Add / Edit Location ──
  addLocation: { en: 'Add Location', ar: 'إضافة موقع' },
  editLocation: { en: 'Edit Location', ar: 'تعديل الموقع' },
  locationNameEn: { en: 'Name (English)', ar: 'الاسم (إنجليزي)' },
  locationNameAr: { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
  descriptionEn: { en: 'Description (English)', ar: 'الوصف (إنجليزي)' },
  descriptionAr: { en: 'Description (Arabic)', ar: 'الوصف (عربي)' },
  addressEn: { en: 'Address (English)', ar: 'العنوان (إنجليزي)' },
  addressAr: { en: 'Address (Arabic)', ar: 'العنوان (عربي)' },
  category: { en: 'Category', ar: 'الفئة' },
  selectCategory: { en: '-- Select Category --', ar: '-- اختر الفئة --' },
  tapMapToSelect: {
    en: 'Tap on the map to select location',
    ar: 'اضغط على الخريطة لتحديد الموقع',
  },
  locationCoordinates: { en: 'Location Coordinates', ar: 'إحداثيات الموقع' },
  selectPhotos: { en: 'Select Photos', ar: 'اختر صوراً' },
  takePhoto: { en: 'Take Photo', ar: 'التقط صورة' },
  save: { en: 'Save', ar: 'حفظ' },
  saving: { en: 'Saving...', ar: 'جارٍ الحفظ...' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  delete: { en: 'Delete', ar: 'حذف' },
  edit: { en: 'Edit', ar: 'تعديل' },
  view: { en: 'View', ar: 'عرض' },
  confirm: { en: 'Confirm', ar: 'تأكيد' },
  deleteConfirm: {
    en: 'Are you sure you want to delete this location?',
    ar: 'هل أنت متأكد من حذف هذا الموقع؟',
  },
  locationAdded: {
    en: 'Location added successfully!',
    ar: 'تم إضافة الموقع بنجاح!',
  },
  locationUpdated: {
    en: 'Location updated successfully!',
    ar: 'تم تحديث الموقع بنجاح!',
  },
  locationDeleted: {
    en: 'Location deleted successfully!',
    ar: 'تم حذف الموقع بنجاح!',
  },

  // ── Profile ──
  myLocations: { en: 'My Locations', ar: 'مواقعي' },
  locationsAdded: { en: 'Locations Added', ar: 'المواقع المضافة' },
  memberSince: { en: 'Member Since', ar: 'عضو منذ' },
  noLocationsYet: {
    en: 'No Locations Added Yet',
    ar: 'لم يتم إضافة مواقع بعد',
  },
  startContributing: {
    en: 'Start contributing by adding your first accessible location!',
    ar: 'ابدأ المساهمة بإضافة أول موقع يمكن الوصول إليه!',
  },
  loginToViewProfile: {
    en: 'Login to view your profile',
    ar: 'سجل الدخول لعرض ملفك الشخصي',
  },

  // ── Chatbot ──
  chatbotTitle: { en: 'JOAccess Assistant', ar: 'مساعد JOAccess' },
  chatPlaceholder: { en: 'Type your message...', ar: 'اكتب رسالتك...' },
  chatWelcome: {
    en: "Hi! I'm here to help you find accessible locations in Jordan. You can ask me about:\n• Wheelchair accessible places\n• Locations with accessible parking\n• Places with accessible restrooms\n• Restaurants, malls, healthcare facilities\n\nWhat are you looking for?",
    ar: 'مرحباً! أنا هنا لمساعدتك في العثور على أماكن يمكن الوصول إليها في الأردن. يمكنك سؤالي عن:\n• أماكن يمكن الوصول إليها بكرسي متحرك\n• مواقع بها مواقف سيارات مخصصة\n• أماكن بها دورات مياه مجهزة\n• مطاعم ومراكز تسوق ومرافق صحية\n\nما الذي تبحث عنه؟',
  },

  // ── Settings ──
  
  settings: {
    en: 'Settings',
    ar: 'الإعدادات',
  },
  settingsSubtitle: {
    en: 'Changes apply instantly across the app',
    ar: 'تغييرات فورية عبر التطبيق',
  },
  display: {
    en: 'Display',
    ar: 'العرض',
  },
  enabled: {
    en: 'enabled',
    ar: 'مُفعّل',
  },
  disabled: {
    en: 'disabled',
    ar: 'معطّل',
  },
  screenReader: {
    en: 'Screen Reader',
    ar: 'قارئ الشاشة',
  },

  // MapScreen additions
  review: {
    en: 'review',
    ar: 'مراجعة',
  },
  
  language: { en: 'Language', ar: 'اللغة' },
  english: { en: 'English', ar: 'الإنجليزية' },
  arabic: { en: 'Arabic', ar: 'العربية' },
  accessibilitySettingsTitle: {
    en: 'Accessibility Settings',
    ar: 'إعدادات الوصول',
  },
  highContrast: { en: 'High Contrast', ar: 'تباين عالي' },
  textSize: { en: 'Text Size', ar: 'حجم الخط' },
  dyslexiaFont: { en: 'Dyslexia-friendly Font', ar: 'خط صديق لعسر القراءة' },
  reducedMotion: { en: 'Reduced Motion', ar: 'حركة مخفضة' },
  colorBlindMode: { en: 'Color Blind Mode', ar: 'وضع عمى الألوان' },
  none: { en: 'None', ar: 'لا يوجد' },
  protanopia: { en: 'Protanopia (Red)', ar: 'عمى اللون الأحمر' },
  deuteranopia: { en: 'Deuteranopia (Green)', ar: 'عمى اللون الأخضر' },
  tritanopia: { en: 'Tritanopia (Blue)', ar: 'عمى اللون الأزرق' },
  achromatopsia: { en: 'Achromatopsia (Full)', ar: 'عمى الألوان الكلي (رمادي)' },
  glassUI: { en: 'Glass UI (Experimental)', ar: 'واجهة زجاجية (تجريبي)' },
  glassUIDesc: { en: 'Translucent blurred elements', ar: 'عناصر شفافة ضبابية' },
  serverUrl: { en: 'Server URL', ar: 'عنوان الخادم' },
  about: { en: 'About', ar: 'حول' },
  version: { en: 'Version', ar: 'الإصدار' },

  // ── Categories ──
  'Restaurants & Cafes': { en: 'Restaurants & Cafes', ar: 'مطاعم ومقاهي' },
  'Shopping Malls': { en: 'Shopping Malls', ar: 'مراكز تسوق' },
  Supermarkets: { en: 'Supermarkets', ar: 'سوبرماركت' },
  Healthcare: { en: 'Healthcare', ar: 'رعاية صحية' },
  Educational: { en: 'Educational', ar: 'تعليمية' },
  'Government Buildings': { en: 'Government Buildings', ar: 'مباني حكومية' },
  'Religious Places': { en: 'Religious Places', ar: 'أماكن دينية' },
  Transportation: { en: 'Transportation', ar: 'مواصلات' },
  'Tourist Attractions': { en: 'Tourist Attractions', ar: 'مناطق سياحية' },
  'Beauty & Wellness': { en: 'Beauty & Wellness', ar: 'تجميل وعافية' },
  Parks: { en: 'Parks', ar: 'حدائق' },
  Entertainment: { en: 'Entertainment', ar: 'ترفيه' },
  Hotels: { en: 'Hotels', ar: 'فنادق' },
  'Banks & ATMs': { en: 'Banks & ATMs', ar: 'بنوك وصرافات' },
  'Sports & Fitness': { en: 'Sports & Fitness', ar: 'رياضة ولياقة' },

  // ── Accessibility Feature Names ──
  wheelchair_ramp: { en: 'Wheelchair Ramp', ar: 'منحدر للكراسي المتحركة' },
  accessible_restroom: { en: 'Accessible Restroom', ar: 'حمام يمكن الوصول إليه' },
  braille_signage: { en: 'Braille Signage', ar: 'لافتات برايل' },
  accessible_parking: { en: 'Accessible Parking', ar: 'موقف سيارات متاح' },
  elevator: { en: 'Elevator', ar: 'مصعد' },
  audio_assistance: { en: 'Audio Assistance', ar: 'مساعدة صوتية' },
  wide_doorways: { en: 'Wide Doorways', ar: 'أبواب واسعة' },
  automatic_doors: { en: 'Automatic Doors', ar: 'أبواب أوتوماتيكية' },

  // ── Common ──
  loading: { en: 'Loading...', ar: 'جارٍ التحميل...' },
  error: { en: 'Error', ar: 'خطأ' },
  success: { en: 'Success', ar: 'نجاح' },
  retry: { en: 'Retry', ar: 'إعادة المحاولة' },
  networkError: {
    en: 'Network error. Please check your connection.',
    ar: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
  },
  loginRequired: {
    en: 'Please login to continue',
    ar: 'يرجى تسجيل الدخول للمتابعة',
  },
  
   // Used by Profile screen's "no account" footer
  noAccount: {
    en: "Don't have an account?",
    ar: 'ليس لديك حساب؟',
  },

  // Fallback text used in sub-headers when we only have a count
  // (not strictly required, but nice to have)
  review: {
    en: 'review',
    ar: 'مراجعة',
  },

  // Used by Profile → edit action on a location row
  edit: {
    en: 'Edit',
    ar: 'تعديل',
  },

  // Used by Signup for optional disability field
  organizationName: {
    en: 'Organization name',
    ar: 'اسم المنظمة',
  },

  disabilityOptional: {
    en: 'Disability (optional)',
    ar: 'الإعاقة (اختياري)',
  },
  
  selectDisabilityType: { en: 'Select disability type...', ar: 'اختر نوع الإعاقة...' },
  wheelchairImpairment: { en: 'Wheelchair/Mobility Impairment', ar: 'إعاقة حركية / كرسي متحرك' },
  visualImpairment: { en: 'Visual Impairment', ar: 'إعاقة بصرية' },
  hearingImpairment: { en: 'Hearing Impairment', ar: 'إعاقة سمعية' },
  cognitiveDisability: { en: 'Cognitive Disability', ar: 'إعاقة ذهنية' },
  multipleDisabilities: { en: 'Multiple Disabilities', ar: 'إعاقات متعددة' },
  otherDisability: { en: 'Other', ar: 'أخرى' },

};

export default translations;
