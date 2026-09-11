export interface Pictogram {
  id: string;
  emoji: string;
  ru: string;
  en: string;
  category: string;
}

export interface PictogramCategory {
  id: string;
  ru: string;
  en: string;
  icon: string;
}

export const PICTOGRAM_CATEGORIES: PictogramCategory[] = [
  { id: 'morning', ru: 'Утро', en: 'Morning', icon: '🌅' },
  { id: 'food', ru: 'Еда', en: 'Food', icon: '🍽' },
  { id: 'school', ru: 'Школа', en: 'School', icon: '📚' },
  { id: 'leisure', ru: 'Досуг', en: 'Leisure', icon: '🎮' },
  { id: 'emotions', ru: 'Эмоции', en: 'Emotions', icon: '😊' },
  { id: 'home', ru: 'Дом', en: 'Home', icon: '🏠' },
  { id: 'clothing', ru: 'Одежда', en: 'Clothing', icon: '👕' },
  { id: 'transport', ru: 'Транспорт', en: 'Transport', icon: '🚌' },
  { id: 'activities', ru: 'Занятия', en: 'Activities', icon: '🎵' },
];

export const PICTOGRAMS: Pictogram[] = [
  // ===== УТРО (Morning) =====
  { id: 'wake-up', emoji: '⏰', ru: 'Проснуться', en: 'Wake up', category: 'morning' },
  { id: 'stretch', emoji: '🙆', ru: 'Потянуться', en: 'Stretch', category: 'morning' },
  { id: 'wash-face', emoji: '🧼', ru: 'Умыться', en: 'Wash face', category: 'morning' },
  { id: 'brush-teeth', emoji: '🪥', ru: 'Почистить зубы', en: 'Brush teeth', category: 'morning' },
  { id: 'shower', emoji: '🚿', ru: 'Душ', en: 'Shower', category: 'morning' },
  { id: 'comb-hair', emoji: '💇', ru: 'Причесаться', en: 'Comb hair', category: 'morning' },
  { id: 'get-dressed', emoji: '👔', ru: 'Одеться', en: 'Get dressed', category: 'morning' },
  { id: 'make-bed', emoji: '🛏', ru: 'Застелить кровать', en: 'Make bed', category: 'morning' },
  { id: 'eat-breakfast', emoji: '🥣', ru: 'Завтрак', en: 'Eat breakfast', category: 'morning' },
  { id: 'take-medicine', emoji: '💊', ru: 'Принять лекарство', en: 'Take medicine', category: 'morning' },
  { id: 'pack-bag', emoji: '🎒', ru: 'Собрать портфель', en: 'Pack bag', category: 'morning' },
  { id: 'go-to-school', emoji: '🏫', ru: 'Идти в школу', en: 'Go to school', category: 'morning' },
  
  // ===== ЕДА (Food) =====
  { id: 'breakfast', emoji: '🍳', ru: 'Завтрак', en: 'Breakfast', category: 'food' },
  { id: 'lunch', emoji: '🍱', ru: 'Обед', en: 'Lunch', category: 'food' },
  { id: 'dinner', emoji: '🍽', ru: 'Ужин', en: 'Dinner', category: 'food' },
  { id: 'snack', emoji: '🍪', ru: 'Перекус', en: 'Snack', category: 'food' },
  { id: 'water', emoji: '💧', ru: 'Вода', en: 'Water', category: 'food' },
  { id: 'juice', emoji: '🧃', ru: 'Сок', en: 'Juice', category: 'food' },
  { id: 'milk', emoji: '🥛', ru: 'Молоко', en: 'Milk', category: 'food' },
  { id: 'tea', emoji: '🍵', ru: 'Чай', en: 'Tea', category: 'food' },
  { id: 'coffee', emoji: '☕', ru: 'Кофе', en: 'Coffee', category: 'food' },
  { id: 'apple', emoji: '🍎', ru: 'Яблоко', en: 'Apple', category: 'food' },
  { id: 'banana', emoji: '🍌', ru: 'Банан', en: 'Banana', category: 'food' },
  { id: 'bread', emoji: '🍞', ru: 'Хлеб', en: 'Bread', category: 'food' },
  { id: 'cheese', emoji: '🧀', ru: 'Сыр', en: 'Cheese', category: 'food' },
  { id: 'soup', emoji: '🍲', ru: 'Суп', en: 'Soup', category: 'food' },
  { id: 'pasta', emoji: '🍝', ru: 'Макароны', en: 'Pasta', category: 'food' },
  { id: 'rice', emoji: '🍚', ru: 'Рис', en: 'Rice', category: 'food' },
  { id: 'salad', emoji: '🥗', ru: 'Салат', en: 'Salad', category: 'food' },
  { id: 'sandwich', emoji: '🥪', ru: 'Бутерброд', en: 'Sandwich', category: 'food' },
  
  // ===== ШКОЛА (School) =====
  { id: 'lesson', emoji: '📖', ru: 'Урок', en: 'Lesson', category: 'school' },
  { id: 'recess', emoji: '🎪', ru: 'Перемена', en: 'Recess', category: 'school' },
  { id: 'reading', emoji: '📚', ru: 'Чтение', en: 'Reading', category: 'school' },
  { id: 'writing', emoji: '✍', ru: 'Письмо', en: 'Writing', category: 'school' },
  { id: 'math', emoji: '🔢', ru: 'Математика', en: 'Math', category: 'school' },
  { id: 'science', emoji: '🔬', ru: 'Наука', en: 'Science', category: 'school' },
  { id: 'art', emoji: '🎨', ru: 'Рисование', en: 'Art', category: 'school' },
  { id: 'music-class', emoji: '🎵', ru: 'Музыка', en: 'Music', category: 'school' },
  { id: 'pe', emoji: '⚽', ru: 'Физкультура', en: 'PE', category: 'school' },
  { id: 'homework', emoji: '📝', ru: 'Домашнее задание', en: 'Homework', category: 'school' },
  { id: 'test', emoji: '📋', ru: 'Контрольная', en: 'Test', category: 'school' },
  { id: 'group-work', emoji: '👥', ru: 'Групповая работа', en: 'Group work', category: 'school' },
  { id: 'presentation', emoji: '📊', ru: 'Презентация', en: 'Presentation', category: 'school' },
  { id: 'computer', emoji: '💻', ru: 'Компьютер', en: 'Computer', category: 'school' },
  { id: 'library', emoji: '📚', ru: 'Библиотека', en: 'Library', category: 'school' },
  
  // ===== ДОСУГ (Leisure) =====
  { id: 'play', emoji: '🎮', ru: 'Игра', en: 'Play', category: 'leisure' },
  { id: 'walk', emoji: '🚶', ru: 'Прогулка', en: 'Walk', category: 'leisure' },
  { id: 'drawing', emoji: '🎨', ru: 'Рисование', en: 'Drawing', category: 'leisure' },
  { id: 'tv', emoji: '📺', ru: 'Телевизор', en: 'TV', category: 'leisure' },
  { id: 'cartoons', emoji: '🎬', ru: 'Мультфильмы', en: 'Cartoons', category: 'leisure' },
  { id: 'books', emoji: '📖', ru: 'Книги', en: 'Books', category: 'leisure' },
  { id: 'puzzles', emoji: '🧩', ru: 'Пазлы', en: 'Puzzles', category: 'leisure' },
  { id: 'board-games', emoji: '🎲', ru: 'Настольные игры', en: 'Board games', category: 'leisure' },
  { id: 'sports', emoji: '⚽', ru: 'Спорт', en: 'Sports', category: 'leisure' },
  { id: 'swimming', emoji: '🏊', ru: 'Плавание', en: 'Swimming', category: 'leisure' },
  { id: 'cycling', emoji: '🚴', ru: 'Велосипед', en: 'Cycling', category: 'leisure' },
  { id: 'dancing', emoji: '💃', ru: 'Танцы', en: 'Dancing', category: 'leisure' },
  { id: 'singing', emoji: '🎤', ru: 'Пение', en: 'Singing', category: 'leisure' },
  { id: 'garden', emoji: '🌷', ru: 'Сад', en: 'Garden', category: 'leisure' },
  { id: 'playground', emoji: '🎪', ru: 'Площадка', en: 'Playground', category: 'leisure' },
  
  // ===== ЭМОЦИИ (Emotions) =====
  { id: 'happy', emoji: '😊', ru: 'Радость', en: 'Happy', category: 'emotions' },
  { id: 'sad', emoji: '😢', ru: 'Грусть', en: 'Sad', category: 'emotions' },
  { id: 'angry', emoji: '😠', ru: 'Злость', en: 'Angry', category: 'emotions' },
  { id: 'scared', emoji: '😨', ru: 'Страх', en: 'Scared', category: 'emotions' },
  { id: 'surprised', emoji: '😲', ru: 'Удивление', en: 'Surprised', category: 'emotions' },
  { id: 'tired', emoji: '😴', ru: 'Усталость', en: 'Tired', category: 'emotions' },
  { id: 'excited', emoji: '🤩', ru: 'Восторг', en: 'Excited', category: 'emotions' },
  { id: 'calm', emoji: '😌', ru: 'Спокойствие', en: 'Calm', category: 'emotions' },
  { id: 'confused', emoji: '😕', ru: 'Смущение', en: 'Confused', category: 'emotions' },
  { id: 'proud', emoji: '😤', ru: 'Гордость', en: 'Proud', category: 'emotions' },
  { id: 'love', emoji: '😍', ru: 'Любовь', en: 'Love', category: 'emotions' },
  { id: 'shy', emoji: '🙈', ru: 'Стеснение', en: 'Shy', category: 'emotions' },
  
  // ===== ДОМ (Home) =====
  { id: 'cleaning', emoji: '🧹', ru: 'Уборка', en: 'Cleaning', category: 'home' },
  { id: 'cooking', emoji: '👨‍🍳', ru: 'Готовка', en: 'Cooking', category: 'home' },
  { id: 'laundry', emoji: '👕', ru: 'Стирка', en: 'Laundry', category: 'home' },
  { id: 'sleep', emoji: '😴', ru: 'Сон', en: 'Sleep', category: 'home' },
  { id: 'nap', emoji: '💤', ru: 'Дневной сон', en: 'Nap', category: 'home' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', ru: 'Семья', en: 'Family', category: 'home' },
  { id: 'pets', emoji: '🐕', ru: 'Питомцы', en: 'Pets', category: 'home' },
  { id: 'chores', emoji: '📋', ru: 'Обязанности', en: 'Chores', category: 'home' },
  { id: 'homework-home', emoji: '📚', ru: 'Домашняя работа', en: 'Homework', category: 'home' },
  { id: 'relax', emoji: '🛋', ru: 'Отдых', en: 'Relax', category: 'home' },
  { id: 'bath', emoji: '🛁', ru: 'Ванна', en: 'Bath', category: 'home' },
  { id: 'story-time', emoji: '📖', ru: 'Чтение перед сном', en: 'Story time', category: 'home' },
  
  // ===== ОДЕЖДА (Clothing) =====
  { id: 'jacket', emoji: '🧥', ru: 'Куртка', en: 'Jacket', category: 'clothing' },
  { id: 'hat', emoji: '🎩', ru: 'Шапка', en: 'Hat', category: 'clothing' },
  { id: 'scarf', emoji: '🧣', ru: 'Шарф', en: 'Scarf', category: 'clothing' },
  { id: 'gloves', emoji: '🧤', ru: 'Перчатки', en: 'Gloves', category: 'clothing' },
  { id: 'boots', emoji: '👢', ru: 'Сапоги', en: 'Boots', category: 'clothing' },
  { id: 'shoes', emoji: '👟', ru: 'Обувь', en: 'Shoes', category: 'clothing' },
  { id: 'socks', emoji: '🧦', ru: 'Носки', en: 'Socks', category: 'clothing' },
  { id: 'pants', emoji: '👖', ru: 'Брюки', en: 'Pants', category: 'clothing' },
  { id: 'shirt', emoji: '👕', ru: 'Рубашка', en: 'Shirt', category: 'clothing' },
  { id: 'dress', emoji: '👗', ru: 'Платье', en: 'Dress', category: 'clothing' },
  { id: 'uniform', emoji: '👔', ru: 'Форма', en: 'Uniform', category: 'clothing' },
  { id: 'pajamas', emoji: '👘', ru: 'Пижама', en: 'Pajamas', category: 'clothing' },
  
  // ===== ТРАНСПОРТ (Transport) =====
  { id: 'bus', emoji: '🚌', ru: 'Автобус', en: 'Bus', category: 'transport' },
  { id: 'car', emoji: '🚗', ru: 'Машина', en: 'Car', category: 'transport' },
  { id: 'walking', emoji: '🚶', ru: 'Пешком', en: 'Walking', category: 'transport' },
  { id: 'train', emoji: '🚆', ru: 'Поезд', en: 'Train', category: 'transport' },
  { id: 'plane', emoji: '✈', ru: 'Самолёт', en: 'Plane', category: 'transport' },
  { id: 'bike', emoji: '🚴', ru: 'Велосипед', en: 'Bike', category: 'transport' },
  { id: 'taxi', emoji: '🚕', ru: 'Такси', en: 'Taxi', category: 'transport' },
  { id: 'subway', emoji: '🚇', ru: 'Метро', en: 'Subway', category: 'transport' },
  { id: 'boat', emoji: '⛵', ru: 'Лодка', en: 'Boat', category: 'transport' },
  
  // ===== ЗАНЯТИЯ (Activities) =====
  { id: 'music', emoji: '🎵', ru: 'Музыка', en: 'Music', category: 'activities' },
  { id: 'piano', emoji: '🎹', ru: 'Фортепиано', en: 'Piano', category: 'activities' },
  { id: 'guitar', emoji: '🎸', ru: 'Гитара', en: 'Guitar', category: 'activities' },
  { id: 'drums', emoji: '🥁', ru: 'Барабаны', en: 'Drums', category: 'activities' },
  { id: 'soccer', emoji: '⚽', ru: 'Футбол', en: 'Soccer', category: 'activities' },
  { id: 'basketball', emoji: '🏀', ru: 'Баскетбол', en: 'Basketball', category: 'activities' },
  { id: 'tennis', emoji: '🎾', ru: 'Теннис', en: 'Tennis', category: 'activities' },
  { id: 'gymnastics', emoji: '🤸', ru: 'Гимнастика', en: 'Gymnastics', category: 'activities' },
  { id: 'crafts', emoji: '✂', ru: 'Поделки', en: 'Crafts', category: 'activities' },
  { id: 'pottery', emoji: '🏺', ru: 'Гончарное дело', en: 'Pottery', category: 'activities' },
  { id: 'coding', emoji: '💻', ru: 'Программирование', en: 'Coding', category: 'activities' },
  { id: 'chess', emoji: '♟', ru: 'Шахматы', en: 'Chess', category: 'activities' },
  { id: 'theater', emoji: '🎭', ru: 'Театр', en: 'Theater', category: 'activities' },
  { id: 'photography', emoji: '📷', ru: 'Фотография', en: 'Photography', category: 'activities' },
];

export function getPictogramsByCategory(categoryId: string): Pictogram[] {
  return PICTOGRAMS.filter(p => p.category === categoryId);
}

export function searchPictograms(query: string): Pictogram[] {
  const lower = query.toLowerCase();
  return PICTOGRAMS.filter(p => 
    p.ru.toLowerCase().includes(lower) || 
    p.en.toLowerCase().includes(lower)
  );
}
