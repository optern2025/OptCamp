-- Phase E.5 Seed Data for Difficulty Progression

-- Insert 5 question sets (D1 A/B, D2 A/B, D3 A) for Full Stack and AI/ML
-- Note: Requires domains to exist. Assuming domains are named 'Full Stack Development' and 'AI/ML'

DO $$ 
DECLARE
  fs_domain_id UUID;
  ai_domain_id UUID;
  set_id UUID;
BEGIN
  SELECT id INTO fs_domain_id FROM public.domains WHERE name ILIKE '%Full Stack%' LIMIT 1;
  SELECT id INTO ai_domain_id FROM public.domains WHERE name ILIKE '%AI/ML%' LIMIT 1;

  IF fs_domain_id IS NOT NULL THEN
    -- Full Stack D1 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (fs_domain_id, 1, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What does HTML stand for?', '["Hyper Text Markup Language", "Hyperlinks and Text Markup Language", "Home Tool Markup Language", "Hyper Tool Markup Language"]', 'Hyper Text Markup Language'),
      (set_id, 'MCQ', 'Who is making the Web standards?', '["Mozilla", "Microsoft", "The World Wide Web Consortium", "Google"]', 'The World Wide Web Consortium'),
      (set_id, 'MCQ', 'Choose the correct HTML element for the largest heading:', '["<h1>", "<h6>", "<head>", "<heading>"]', '<h1>'),
      (set_id, 'MCQ', 'What is the correct HTML element for inserting a line break?', '["<lb>", "<br>", "<break>", "<newline>"]', '<br>'),
      (set_id, 'MCQ', 'What is the correct HTML for adding a background color?', '["<body bg=''yellow''>", "<background>yellow</background>", "<body style=''background-color:yellow;''>", "<body color=''yellow''>"]', '<body style=''background-color:yellow;''>'),
      (set_id, 'MCQ', 'Choose the correct HTML element to define important text', '["<strong>", "<b>", "<important>", "<i>"]', '<strong>'),
      (set_id, 'MCQ', 'Choose the correct HTML element to define emphasized text', '["<i>", "<italic>", "<em>", "<strong>"]', '<em>');

    -- Full Stack D1 Set B
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (fs_domain_id, 1, 2, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What does CSS stand for?', '["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"]', 'Cascading Style Sheets'),
      (set_id, 'MCQ', 'What is the correct HTML for referring to an external style sheet?', '["<stylesheet>mystyle.css</stylesheet>", "<style src=''mystyle.css''>", "<link rel=''stylesheet'' type=''text/css'' href=''mystyle.css''>", "<script src=''mystyle.css''>"]', '<link rel=''stylesheet'' type=''text/css'' href=''mystyle.css''>'),
      (set_id, 'MCQ', 'Where in an HTML document is the correct place to refer to an external style sheet?', '["In the <body> section", "In the <head> section", "At the end of the document", "Anywhere"]', 'In the <head> section'),
      (set_id, 'MCQ', 'Which HTML tag is used to define an internal style sheet?', '["<style>", "<script>", "<css>", "<link>"]', '<style>'),
      (set_id, 'MCQ', 'Which HTML attribute is used to define inline styles?', '["font", "class", "styles", "style"]', 'style'),
      (set_id, 'MCQ', 'Which is the correct CSS syntax?', '["body {color: black;}", "{body:color=black;}", "body:color=black;", "{body;color:black;}"]', 'body {color: black;}'),
      (set_id, 'MCQ', 'How do you insert a comment in a CSS file?', '["// this is a comment", "/* this is a comment */", "'' this is a comment", "<!-- this is a comment -->"]', '/* this is a comment */');

    -- Full Stack D2 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (fs_domain_id, 2, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'Inside which HTML element do we put the JavaScript?', '["<scripting>", "<javascript>", "<js>", "<script>"]', '<script>'),
      (set_id, 'MCQ', 'What is the correct syntax for referring to an external script called ''xxx.js''?', '["<script href=''xxx.js''>", "<script name=''xxx.js''>", "<script src=''xxx.js''>", "<link href=''xxx.js''>"]', '<script src=''xxx.js''>'),
      (set_id, 'MCQ', 'How do you write ''Hello World'' in an alert box?', '["msgBox(''Hello World'');", "alertBox(''Hello World'');", "msg(''Hello World'');", "alert(''Hello World'');"]', 'alert(''Hello World'');'),
      (set_id, 'MCQ', 'How do you create a function in JavaScript?', '["function:myFunction()", "function myFunction()", "function = myFunction()", "create myFunction()"]', 'function myFunction()'),
      (set_id, 'MCQ', 'How do you call a function named ''myFunction''?', '["call function myFunction()", "call myFunction()", "myFunction()", "execute myFunction()"]', 'myFunction()'),
      (set_id, 'MCQ', 'How to write an IF statement in JavaScript?', '["if i = 5 then", "if i == 5 then", "if (i == 5)", "if i = 5"]', 'if (i == 5)'),
      (set_id, 'MCQ', 'How does a WHILE loop start?', '["while i = 1 to 10", "while (i <= 10; i++)", "while (i <= 10)", "until i = 10"]', 'while (i <= 10)');

    -- Full Stack D2 Set B
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (fs_domain_id, 2, 2, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'Which built-in method adds one or more elements to the end of an array and returns the new length?', '["last()", "put()", "push()", "pop()"]', 'push()'),
      (set_id, 'MCQ', 'Which built-in method returns the calling string value converted to lower case?', '["toLowerCase()", "toLower()", "changeCase(case)", "None of the above"]', 'toLowerCase()'),
      (set_id, 'MCQ', 'Which of the following function of Number object returns a string value version of the current number?', '["toString()", "toFixed()", "toLocaleString()", "toPrecision()"]', 'toString()'),
      (set_id, 'MCQ', 'Which of the following function of String object causes a string to be displayed as a subscript?', '["sup()", "small()", "strike()", "sub()"]', 'sub()'),
      (set_id, 'MCQ', 'Which of the following function of Array object joins all elements of an array into a string?', '["concat()", "join()", "pop()", "map()"]', 'join()'),
      (set_id, 'MCQ', 'Which event occurs when the user clicks on an HTML element?', '["onmouseclick", "onchange", "onclick", "onmouseover"]', 'onclick'),
      (set_id, 'MCQ', 'Is JavaScript case-sensitive?', '["Yes", "No", "Only in strict mode", "Depending on browser"]', 'Yes');

    -- Full Stack D3 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (fs_domain_id, 3, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is the purpose of the virtual DOM in React?', '["To directly manipulate the browser''s DOM more efficiently", "To provide a lightweight copy of the actual DOM for performance optimization", "To store application state", "To replace HTML with JSX"]', 'To provide a lightweight copy of the actual DOM for performance optimization'),
      (set_id, 'MCQ', 'Which hook is used to perform side effects in a function component?', '["useState", "useContext", "useEffect", "useReducer"]', 'useEffect'),
      (set_id, 'MCQ', 'What does the ''key'' prop do in a React list?', '["Helps React identify which items have changed, are added, or are removed", "Styles the list item", "Sets an id attribute on the DOM element", "Determines the array index"]', 'Helps React identify which items have changed, are added, or are removed'),
      (set_id, 'MCQ', 'What is the output of typeof null in JavaScript?', '["''null''", "''undefined''", "''object''", "''number''"]', '''object'''),
      (set_id, 'MCQ', 'Which of the following is a way to handle asynchronous operations in JavaScript?', '["Promises", "Callbacks", "Async/Await", "All of the above"]', 'All of the above'),
      (set_id, 'MCQ', 'What is CORS?', '["Cross-Origin Resource Sharing", "Cross-Origin Resource Security", "Centralized Origin Routing System", "Control Option Response Status"]', 'Cross-Origin Resource Sharing'),
      (set_id, 'MCQ', 'What is the main difference between SQL and NoSQL databases?', '["SQL uses tables, NoSQL uses documents or key-value pairs", "SQL is faster than NoSQL", "NoSQL cannot handle transactions", "SQL is only for web apps"]', 'SQL uses tables, NoSQL uses documents or key-value pairs');
  END IF;

  IF ai_domain_id IS NOT NULL THEN
    -- AI/ML D1 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (ai_domain_id, 1, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is Artificial Intelligence?', '["Making a machine intelligent", "Programming with your own intelligence", "Putting your intelligence into a machine", "Playing a game"]', 'Making a machine intelligent'),
      (set_id, 'MCQ', 'Which of the following is a type of Machine Learning?', '["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "All of the above"]', 'All of the above'),
      (set_id, 'MCQ', 'What is the most popular programming language for AI/ML?', '["Java", "C++", "Python", "Ruby"]', 'Python'),
      (set_id, 'MCQ', 'What does NLP stand for?', '["Natural Language Processing", "Neural Language Programming", "Network Logic Protocol", "New Learning Process"]', 'Natural Language Processing'),
      (set_id, 'MCQ', 'What is a neural network?', '["A computer network", "A biological brain", "A computing system inspired by biological neural networks", "A type of database"]', 'A computing system inspired by biological neural networks'),
      (set_id, 'MCQ', 'What is the main goal of supervised learning?', '["To find hidden patterns", "To predict an output variable from input variables", "To learn from interacting with an environment", "To cluster data"]', 'To predict an output variable from input variables'),
      (set_id, 'MCQ', 'Which of these is a popular ML library in Python?', '["React", "Scikit-learn", "Django", "Express"]', 'Scikit-learn');

    -- AI/ML D1 Set B
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (ai_domain_id, 1, 2, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is overfitting in Machine Learning?', '["When a model learns the training data too well, including noise, and performs poorly on new data", "When a model is too simple to capture patterns", "When training data is too large", "When the learning rate is too high"]', 'When a model learns the training data too well, including noise, and performs poorly on new data'),
      (set_id, 'MCQ', 'What is a common technique to prevent overfitting?', '["Adding more layers", "Training longer", "Cross-validation", "Decreasing dataset size"]', 'Cross-validation'),
      (set_id, 'MCQ', 'What is a confusion matrix used for?', '["Evaluating the performance of a classification model", "Confusing the user", "Data preprocessing", "Feature extraction"]', 'Evaluating the performance of a classification model'),
      (set_id, 'MCQ', 'Which metric is best for imbalanced classification?', '["Accuracy", "F1 Score", "Mean Squared Error", "R-squared"]', 'F1 Score'),
      (set_id, 'MCQ', 'What does ''K'' stand for in K-Means clustering?', '["The number of clusters", "The number of iterations", "The number of features", "The number of data points"]', 'The number of clusters'),
      (set_id, 'MCQ', 'Which algorithm is used for regression tasks?', '["Logistic Regression", "Linear Regression", "K-Means", "PCA"]', 'Linear Regression'),
      (set_id, 'MCQ', 'What is a ''feature'' in Machine Learning?', '["A bug in the code", "An individual measurable property or characteristic of a phenomenon", "A software capability", "A type of neural network layer"]', 'An individual measurable property or characteristic of a phenomenon');

    -- AI/ML D2 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (ai_domain_id, 2, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is the purpose of an activation function in a neural network?', '["To introduce non-linearity into the output of a neuron", "To speed up training", "To initialize weights", "To calculate loss"]', 'To introduce non-linearity into the output of a neuron'),
      (set_id, 'MCQ', 'Which activation function outputs values between 0 and 1?', '["ReLU", "Tanh", "Sigmoid", "Linear"]', 'Sigmoid'),
      (set_id, 'MCQ', 'What does CNN stand for?', '["Convolutional Neural Network", "Central Neural Network", "Computed Neural Node", "Cascading Neural Network"]', 'Convolutional Neural Network'),
      (set_id, 'MCQ', 'CNNs are primarily used for which type of data?', '["Text", "Audio", "Images", "Tabular data"]', 'Images'),
      (set_id, 'MCQ', 'What is the vanishing gradient problem?', '["When gradients become too large during training", "When gradients become infinitesimally small, preventing weights from updating", "When the loss function diverges", "When the dataset is too small"]', 'When gradients become infinitesimally small, preventing weights from updating'),
      (set_id, 'MCQ', 'Which architecture is commonly used to address the vanishing gradient problem in RNNs?', '["CNN", "GAN", "LSTM", "MLP"]', 'LSTM'),
      (set_id, 'MCQ', 'What is backpropagation?', '["An algorithm for updating weights in a neural network based on the error rate", "A method for data augmentation", "A type of activation function", "A clustering algorithm"]', 'An algorithm for updating weights in a neural network based on the error rate');

    -- AI/ML D2 Set B
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (ai_domain_id, 2, 2, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is dropout in the context of neural networks?', '["A regularization technique where randomly selected neurons are ignored during training", "A method for handling missing data", "Stopping training early", "Removing outliers from the dataset"]', 'A regularization technique where randomly selected neurons are ignored during training'),
      (set_id, 'MCQ', 'What is a hyperparameter?', '["A parameter whose value is learned during training", "A parameter whose value is set before the learning process begins", "A parameter with a very large value", "A feature in the dataset"]', 'A parameter whose value is set before the learning process begins'),
      (set_id, 'MCQ', 'Which of the following is a hyperparameter?', '["Weights", "Biases", "Learning Rate", "Predictions"]', 'Learning Rate'),
      (set_id, 'MCQ', 'What does PCA do?', '["Increases data dimensionality", "Reduces data dimensionality while preserving variance", "Classifies data", "Clusters data"]', 'Reduces data dimensionality while preserving variance'),
      (set_id, 'MCQ', 'What is a random forest?', '["A single decision tree", "An ensemble learning method that constructs a multitude of decision trees", "A type of neural network", "A clustering algorithm"]', 'An ensemble learning method that constructs a multitude of decision trees'),
      (set_id, 'MCQ', 'What is ''gradient descent''?', '["An optimization algorithm used to minimize the cost function", "A method for feature scaling", "A type of loss function", "A data preprocessing step"]', 'An optimization algorithm used to minimize the cost function'),
      (set_id, 'MCQ', 'What is the difference between batch and stochastic gradient descent?', '["Batch uses the whole dataset; Stochastic uses one example per iteration", "Batch is faster; Stochastic is slower", "Batch is for regression; Stochastic is for classification", "There is no difference"]', 'Batch uses the whole dataset; Stochastic uses one example per iteration');

    -- AI/ML D3 Set A
    INSERT INTO public.screening_question_sets (domain_id, difficulty_level, version, is_active) VALUES (ai_domain_id, 3, 1, true) RETURNING id INTO set_id;
    INSERT INTO public.screening_questions (set_id, type, content, options, correct_answer) VALUES
      (set_id, 'MCQ', 'What is the core mathematical mechanism behind the attention mechanism in Transformers?', '["Scaled Dot-Product Attention", "Max Pooling", "Convolution", "Recurrent Feedback"]', 'Scaled Dot-Product Attention'),
      (set_id, 'MCQ', 'In a GAN (Generative Adversarial Network), what are the two main components?', '["Encoder and Decoder", "Generator and Discriminator", "Actor and Critic", "Teacher and Student"]', 'Generator and Discriminator'),
      (set_id, 'MCQ', 'What problem does Batch Normalization solve?', '["Internal Covariate Shift", "Vanishing Gradients", "Overfitting only", "Data Imbalance"]', 'Internal Covariate Shift'),
      (set_id, 'MCQ', 'What is ''Transfer Learning''?', '["Learning multiple tasks simultaneously", "Using knowledge gained while solving one problem and applying it to a different but related problem", "Transferring data between servers", "Learning from non-stationary distributions"]', 'Using knowledge gained while solving one problem and applying it to a different but related problem'),
      (set_id, 'MCQ', 'Which loss function is typically used for multi-class classification problems?', '["Mean Squared Error", "Binary Cross-Entropy", "Categorical Cross-Entropy", "Hinge Loss"]', 'Categorical Cross-Entropy'),
      (set_id, 'MCQ', 'What does BLEU score measure?', '["Image classification accuracy", "Machine translation quality", "Speech recognition error rate", "Clustering quality"]', 'Machine translation quality'),
      (set_id, 'MCQ', 'In reinforcement learning, what is the Bellman Equation used for?', '["Calculating the loss gradient", "Expressing the relationship between the value of a state and the values of its successor states", "Updating network weights", "Generating random actions"]', 'Expressing the relationship between the value of a state and the values of its successor states');
  END IF;
END $$;
