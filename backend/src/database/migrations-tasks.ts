import type { Migration } from './migrations';
import { tableExists } from './migration-utils';

/** Schema for the tasks product (tables prefixed task_ / tasker_). Applied after the core MIGRATIONS. */

const CATEGORIES: Array<[string, string, string]> = [
  // [slug, name, lucide icon]
  ['cleaning', 'Cleaning', 'Sparkles'],
  ['moving', 'Moving & Removals', 'Truck'],
  ['delivery', 'Delivery & Errands', 'Package'],
  ['handyman', 'Handyman', 'Hammer'],
  ['gardening', 'Gardening', 'Flower2'],
  ['assembly', 'Furniture Assembly', 'Armchair'],
  ['painting', 'Painting', 'PaintRoller'],
  ['electrical', 'Electrical', 'Zap'],
  ['plumbing', 'Plumbing', 'Wrench'],
  ['tutoring', 'Tutoring & Lessons', 'GraduationCap'],
  ['computer-it', 'Computer & IT', 'Laptop'],
  ['photography', 'Photography & Video', 'Camera'],
  ['events', 'Events & Catering', 'PartyPopper'],
  ['design', 'Design', 'Palette'],
  ['writing', 'Writing & Translation', 'PenLine'],
  ['admin', 'Admin & Data Entry', 'ClipboardList'],
  ['other', 'Other', 'CircleHelp'],
];

/** One CREATE TABLE per dialect; column lists are kept side by side so they stay in sync. */
async function createTable(ds: any, pg: boolean, name: string, pgSql: string, mySql: string) {
  if (await tableExists(ds, name)) return;
  await ds.query(pg ? pgSql : mySql);
}

export const TASKS_MIGRATIONS: Migration[] = [
  {
    id: '200_tasks_schema',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';

      await createTable(ds, pg, 'task_category', `
        CREATE TABLE task_category (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(60) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(40),
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_category\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`slug\` VARCHAR(60) NOT NULL UNIQUE,
          \`name\` VARCHAR(100) NOT NULL,
          \`icon\` VARCHAR(40) NULL,
          \`sort_order\` INT NOT NULL DEFAULT 0,
          \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (\`id\`)
        )
      `);

      await createTable(ds, pg, 'task', `
        CREATE TABLE task (
          id SERIAL PRIMARY KEY,
          poster_id INT NOT NULL,
          category_id INT NOT NULL,
          title VARCHAR(150) NOT NULL,
          description TEXT NOT NULL,
          location_type VARCHAR(20) NOT NULL DEFAULT 'in_person',
          district VARCHAR(50),
          city VARCHAR(100),
          due_date DATE,
          flexible BOOLEAN NOT NULL DEFAULT FALSE,
          budget DECIMAL(12,2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          assigned_offer_id INT,
          assigned_tasker_id INT,
          agreed_amount DECIMAL(12,2),
          offers_count INT NOT NULL DEFAULT 0,
          hidden BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMP,
          closed_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`poster_id\` INT NOT NULL,
          \`category_id\` INT NOT NULL,
          \`title\` VARCHAR(150) NOT NULL,
          \`description\` TEXT NOT NULL,
          \`location_type\` VARCHAR(20) NOT NULL DEFAULT 'in_person',
          \`district\` VARCHAR(50) NULL,
          \`city\` VARCHAR(100) NULL,
          \`due_date\` DATE NULL,
          \`flexible\` TINYINT(1) NOT NULL DEFAULT 0,
          \`budget\` DECIMAL(12,2) NOT NULL,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'open',
          \`assigned_offer_id\` INT NULL,
          \`assigned_tasker_id\` INT NULL,
          \`agreed_amount\` DECIMAL(12,2) NULL,
          \`offers_count\` INT NOT NULL DEFAULT 0,
          \`hidden\` TINYINT(1) NOT NULL DEFAULT 0,
          \`completed_at\` DATETIME NULL,
          \`closed_at\` DATETIME NULL,
          \`cancelled_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_status\` (\`status\`, \`hidden\`),
          KEY \`idx_task_poster\` (\`poster_id\`),
          KEY \`idx_task_tasker\` (\`assigned_tasker_id\`)
        )
      `);
      if (pg) {
        await ds.query('CREATE INDEX IF NOT EXISTS idx_task_status ON task (status, hidden)');
        await ds.query('CREATE INDEX IF NOT EXISTS idx_task_poster ON task (poster_id)');
        await ds.query('CREATE INDEX IF NOT EXISTS idx_task_tasker ON task (assigned_tasker_id)');
      }

      await createTable(ds, pg, 'task_attachment', `
        CREATE TABLE task_attachment (
          id SERIAL PRIMARY KEY,
          task_id INT NOT NULL,
          url VARCHAR(500) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_attachment\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`task_id\` INT NOT NULL,
          \`url\` VARCHAR(500) NOT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_attachment_task\` (\`task_id\`)
        )
      `);

      await createTable(ds, pg, 'task_question', `
        CREATE TABLE task_question (
          id SERIAL PRIMARY KEY,
          task_id INT NOT NULL,
          user_id INT NOT NULL,
          parent_id INT,
          body TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_question\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`task_id\` INT NOT NULL,
          \`user_id\` INT NOT NULL,
          \`parent_id\` INT NULL,
          \`body\` TEXT NOT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_question_task\` (\`task_id\`)
        )
      `);

      await createTable(ds, pg, 'task_offer', `
        CREATE TABLE task_offer (
          id SERIAL PRIMARY KEY,
          task_id INT NOT NULL,
          tasker_id INT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_offer\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`task_id\` INT NOT NULL,
          \`tasker_id\` INT NOT NULL,
          \`amount\` DECIMAL(12,2) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_offer_task\` (\`task_id\`),
          KEY \`idx_task_offer_tasker\` (\`tasker_id\`)
        )
      `);

      await createTable(ds, pg, 'task_message', `
        CREATE TABLE task_message (
          id SERIAL PRIMARY KEY,
          task_id INT NOT NULL,
          sender_id INT NOT NULL,
          body TEXT NOT NULL,
          read_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_message\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`task_id\` INT NOT NULL,
          \`sender_id\` INT NOT NULL,
          \`body\` TEXT NOT NULL,
          \`read_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_message_task\` (\`task_id\`)
        )
      `);

      await createTable(ds, pg, 'task_review', `
        CREATE TABLE task_review (
          id SERIAL PRIMARY KEY,
          task_id INT NOT NULL,
          reviewer_id INT NOT NULL,
          reviewee_id INT NOT NULL,
          role VARCHAR(20) NOT NULL,
          rating INT NOT NULL,
          comment TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (task_id, reviewer_id)
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_review\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`task_id\` INT NOT NULL,
          \`reviewer_id\` INT NOT NULL,
          \`reviewee_id\` INT NOT NULL,
          \`role\` VARCHAR(20) NOT NULL,
          \`rating\` INT NOT NULL,
          \`comment\` TEXT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_task_review\` (\`task_id\`, \`reviewer_id\`),
          KEY \`idx_task_review_reviewee\` (\`reviewee_id\`)
        )
      `);

      await createTable(ds, pg, 'tasker_profile', `
        CREATE TABLE tasker_profile (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          headline VARCHAR(120),
          bio TEXT,
          skills TEXT,
          district VARCHAR(50),
          phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
          rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
          rating_count INT NOT NULL DEFAULT 0,
          completed_count INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`tasker_profile\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NOT NULL UNIQUE,
          \`headline\` VARCHAR(120) NULL,
          \`bio\` TEXT NULL,
          \`skills\` TEXT NULL,
          \`district\` VARCHAR(50) NULL,
          \`phone_verified\` TINYINT(1) NOT NULL DEFAULT 0,
          \`rating_avg\` DECIMAL(3,2) NOT NULL DEFAULT 0,
          \`rating_count\` INT NOT NULL DEFAULT 0,
          \`completed_count\` INT NOT NULL DEFAULT 0,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        )
      `);

      await createTable(ds, pg, 'task_notification', `
        CREATE TABLE task_notification (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          task_id INT,
          type VARCHAR(40) NOT NULL,
          title VARCHAR(200) NOT NULL,
          body TEXT,
          read_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_notification\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NOT NULL,
          \`task_id\` INT NULL,
          \`type\` VARCHAR(40) NOT NULL,
          \`title\` VARCHAR(200) NOT NULL,
          \`body\` TEXT NULL,
          \`read_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_task_notification_user\` (\`user_id\`, \`read_at\`)
        )
      `);

      await createTable(ds, pg, 'task_report', `
        CREATE TABLE task_report (
          id SERIAL PRIMARY KEY,
          reporter_id INT NOT NULL,
          task_id INT,
          reported_user_id INT,
          reason VARCHAR(100) NOT NULL,
          details TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP
        )
      `, `
        CREATE TABLE IF NOT EXISTS \`task_report\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`reporter_id\` INT NOT NULL,
          \`task_id\` INT NULL,
          \`reported_user_id\` INT NULL,
          \`reason\` VARCHAR(100) NOT NULL,
          \`details\` TEXT NULL,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'open',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`resolved_at\` DATETIME NULL,
          PRIMARY KEY (\`id\`)
        )
      `);

      // Seed categories (idempotent on slug)
      for (const [i, [slug, name, icon]] of CATEGORIES.entries()) {
        const exists = await ds.query(
          pg ? 'SELECT 1 FROM task_category WHERE slug = $1' : 'SELECT 1 FROM `task_category` WHERE slug = ?',
          [slug],
        );
        if (exists.length) continue;
        await ds.query(
          pg
            ? 'INSERT INTO task_category (slug, name, icon, sort_order) VALUES ($1, $2, $3, $4)'
            : 'INSERT INTO `task_category` (slug, name, icon, sort_order) VALUES (?, ?, ?, ?)',
          [slug, name, icon, i],
        );
      }
    },
  },
];
