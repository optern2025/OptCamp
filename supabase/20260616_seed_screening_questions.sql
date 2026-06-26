-- Ensure Domains Exist
INSERT INTO public.domains (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Full Stack Development', 'Core web development encompassing frontend and backend systems.'),
  ('22222222-2222-2222-2222-222222222222', 'AI / ML', 'Artificial Intelligence and Machine Learning fundamentals and practical implementation.')
ON CONFLICT (id) DO NOTHING;

-- Seed Question Sets (Difficulty Level 1, Version 1)
INSERT INTO public.screening_question_sets (id, domain_id, difficulty_level, version, is_active) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 1, 1, true),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 1, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Exactly 7 Questions for Full Stack Development
INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer, explanation) VALUES
  ('33333333-3333-3333-3333-333333333333', 'MCQ', 'Which HTTP method is typically used to update an existing resource completely?', '["GET", "POST", "PUT", "PATCH"]', 'PUT', 'PUT is used for complete replacements, while PATCH is for partial updates.'),
  ('33333333-3333-3333-3333-333333333333', 'MCQ', 'In React, what hook is used to perform side effects?', '["useState", "useEffect", "useContext", "useReducer"]', 'useEffect', 'useEffect is the standard hook for side effects in React.'),
  ('33333333-3333-3333-3333-333333333333', 'MCQ', 'What does ACID stand for in the context of databases?', '["Atomicity, Consistency, Isolation, Durability", "Automated, Concurrent, Indexed, Distributed", "Association, Connectivity, Integration, Data", "Always Consistent In Database"]', 'Atomicity, Consistency, Isolation, Durability', 'ACID properties guarantee database transactions are processed reliably.'),
  ('33333333-3333-3333-3333-333333333333', 'practical', 'Write a SQL query to select all users whose email ends with "@optcamp.com". Assume the table is "users" and the column is "email".', null, 'SELECT * FROM users WHERE email LIKE ''%@optcamp.com'';', 'Expects a standard LIKE clause with wildcard prefix.'),
  ('33333333-3333-3333-3333-333333333333', 'MCQ', 'Which of the following is NOT a fundamental feature of Node.js?', '["Event-driven", "Non-blocking I/O", "Multi-threaded", "Asynchronous"]', 'Multi-threaded', 'Node.js runs on a single-threaded event loop architecture.'),
  ('33333333-3333-3333-3333-333333333333', 'MCQ', 'What is the purpose of a JWT (JSON Web Token)?', '["To compress data for faster transmission", "To securely transmit information between parties as a JSON object", "To encrypt passwords in the database", "To execute JavaScript on the client side"]', 'To securely transmit information between parties as a JSON object', 'JWTs are commonly used for stateless authentication.'),
  ('33333333-3333-3333-3333-333333333333', 'practical', 'Provide a simple regex pattern that matches exactly 6 digits.', null, '^\d{6}$', 'Expects ^ and $ anchors with exactly 6 digits.');

-- Seed Exactly 7 Questions for AI / ML
INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer, explanation) VALUES
  ('44444444-4444-4444-4444-444444444444', 'MCQ', 'Which type of learning involves an algorithm learning from unlabeled data?', '["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Transfer Learning"]', 'Unsupervised Learning', 'Unsupervised learning finds hidden structures in unlabeled data.'),
  ('44444444-4444-4444-4444-444444444444', 'MCQ', 'What does CNN stand for in Deep Learning?', '["Convolutional Neural Network", "Computed Normalization Node", "Concurrent Neural Network", "Categorical Node Network"]', 'Convolutional Neural Network', 'CNNs are heavily used in image processing.'),
  ('44444444-4444-4444-4444-444444444444', 'MCQ', 'Which metric is most appropriate for evaluating an imbalanced classification dataset?', '["Accuracy", "Mean Squared Error", "F1 Score", "R-squared"]', 'F1 Score', 'F1 Score balances precision and recall, making it better for imbalanced classes.'),
  ('44444444-4444-4444-4444-444444444444', 'practical', 'Write a simple Python import statement to load the pandas library and alias it as "pd".', null, 'import pandas as pd', 'Standard pandas import syntax.'),
  ('44444444-4444-4444-4444-444444444444', 'MCQ', 'What is the purpose of an activation function in a neural network?', '["To initialize weights", "To calculate the loss", "To introduce non-linearity into the network", "To update the learning rate"]', 'To introduce non-linearity into the network', 'Without non-linearity, a neural network is just a linear regression model.'),
  ('44444444-4444-4444-4444-444444444444', 'MCQ', 'What is overfitting?', '["When a model performs poorly on training data", "When a model learns the training data too well, failing to generalize to new data", "When a model takes too long to train", "When a model uses too many parameters"]', 'When a model learns the training data too well, failing to generalize to new data', 'Overfitting captures noise as a pattern.'),
  ('44444444-4444-4444-4444-444444444444', 'practical', 'What function is used in scikit-learn to split a dataset into training and testing sets? Provide the function name.', null, 'train_test_split', 'train_test_split is the standard sklearn function.');
