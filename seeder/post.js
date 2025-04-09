
// CREATE TABLE `posts` (
//   `id` int(10) UNSIGNED NOT NULL,
//   `content` text NOT NULL,
//   `created_at` date NOT NULL,
//   `updated_at` date NOT NULL,
//   `votes` text NOT NULL,
//   `user_id` int(10) UNSIGNED DEFAULT NULL
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



import { faker } from "@faker-js/faker";

export function createPost() {

  return {
    content: faker.word.words({ count: {min: 15, max: 50} }),
    created_at: faker.date.past({ years: 5 }),
    updated_at: faker.date.recent({ days: 5}),
  };
}