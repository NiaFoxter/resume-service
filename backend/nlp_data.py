"""
Лінгвістичні дані для NLP аналізу резюме.
"""

import re

STOPWORDS_UK = {
    'і', 'й', 'та', 'або', 'але', 'бо', 'щоб', 'якщо', 'коли', 'де', 'що', 'як',
    'у', 'в', 'на', 'з', 'за', 'до', 'від', 'по', 'при', 'над', 'під', 'між',
    'це', 'той', 'такий', 'наш', 'ваш', 'ми', 'ви', 'він', 'вона', 'вони',
    'є', 'був', 'була', 'були', 'буде', 'не', 'так', 'ні', 'вже', 'ще', 'теж',
    'дуже', 'більш', 'менш', 'може', 'треба', 'потрібно', 'має', 'мати',
    'для', 'про', 'через', 'після', 'перед', 'без', 'крім', 'щодо',
    'свого', 'своїх', 'його', 'її', 'їх', 'ним', 'нею', 'ними',
    'також', 'тому', 'цього', 'цьому', 'цим', 'яким', 'яка', 'яке',
    'бути', 'було', 'будуть', 'будеш', 'будемо', 'будете',
    'лише', 'ось', 'хто', 'чий', 'котрий', 'себе', 'собі', 'собою',
    'тільки', 'зараз', 'потім', 'тут', 'там', 'куди', 'звідки',
    'кожен', 'кожна', 'кожне', 'кожні', 'весь', 'вся', 'все', 'всі',
    'інший', 'інша', 'інше', 'інші', 'самий', 'сама', 'саме', 'самі',
    'можна', 'варто', 'слід', 'мабуть', 'напевно',
    'тобто', 'наприклад', 'зокрема', 'особливо',
    'б', 'би', 'ж', 'же', 'от', 'то', 'чи', 'хіба', 'невже',
    'поки', 'доки', 'щойно', 'ледве', 'тільки-но',
    'ніби', 'наче', 'неначе', 'мов', 'немов',
    'досить', 'доволі', 'надто', 'занадто',
    'всередині', 'навколо', 'поруч', 'поблизу',
    'протягом', 'впродовж', 'наприкінці', 'спочатку',
    'досвід', 'досвіду', 'досвідом', 'досвіді',
    'знання', 'знань', 'знаннями', 'знаннях',
    'навички', 'навичок', 'навичками', 'навичках',
    'вміння', 'вмінь', 'вміннями',
    'вимоги', 'вимог', 'вимогами',
    'необхідні', 'необхідний', 'необхідна', 'необхідне', 'необхідних',
    'обов\'язкові', 'обов\'язковий', 'обов\'язкова',
    'бажані', 'бажаний', 'бажана',
    'років', 'роки', 'рік', 'місяців', 'місяць', 'місяці',
    'комерційний', 'комерційна', 'комерційне', 'комерційні', 'комерційного',
    'глибокі', 'глибокий', 'глибока', 'глибоке', 'глибоких',
    'широкі', 'широкий',
    'великий', 'велика', 'велике', 'великі',
    'буде', 'плюсом', 'перевагою',
    'пропонуємо', 'пропонує', 'пропонують',
    'кандидат', 'кандидата', 'претендент',
    'спеціаліст', 'спеціаліста', 'фахівець', 'фахівця',
    'посада', 'посади', 'вакансія', 'вакансії',
    'компанія', 'компанії', 'відділ', 'відділу',
    'офіс', 'дистанційно', 'гібридний',
    'зарплата', 'оклад', 'страхування', 'відпустка',
    'розгляду', 'приймаємо', 'запрошуємо',
}

STOPWORDS_EN = {
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'shall', 'must', 'need',
    'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'we', 'you', 'he', 'she', 'it', 'they', 'our', 'your', 'their', 'its',
    'this', 'that', 'these', 'those', 'which', 'who', 'whom',
    'very', 'just', 'than', 'then', 'also', 'too', 'only', 'some',
    'any', 'each', 'every', 'all', 'few', 'more', 'most', 'other',
    'over', 'under', 'again', 'further', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'what', 'now', 'well',
    'such', 'much', 'many', 'little', 'own', 'same', 'last',
    'after', 'before', 'between', 'among', 'during', 'while',
    'although', 'though', 'because', 'since', 'unless', 'until',
    'already', 'always', 'usually', 'often', 'sometimes', 'never',
    'really', 'quite', 'almost', 'perhaps', 'maybe', 'probably',
    'still', 'yet', 'even', 'ever', 'never',
    'experience', 'experienced', 'experiences',
    'knowledge', 'knowledges',
    'skill', 'skills', 'skilled',
    'required', 'requirement', 'requirements', 'require',
    'years', 'year', 'yearly',
    'months', 'month', 'monthly',
    'looking', 'seeking',
    'must', 'should', 'need', 'needed',
    'plus', 'bonus', 'advantage',
    'good', 'great', 'strong', 'excellent',
    'deep', 'broad', 'extensive', 'solid',
    'proficient', 'familiar',
    'understanding', 'ability',
    'work', 'working', 'team', 'company',
    'position', 'role', 'job', 'candidate', 'applicant',
    'office', 'remote', 'hybrid',
    'salary', 'compensation', 'benefit',
    'insurance', 'vacation', 'culture',
    'join', 'hiring', 'apply',
    'ideally', 'preferably', 'nice',
    'passion', 'passionate', 'motivated', 'talented', 'driven',
    'responsible', 'responsibilities',
}

STOPWORDS_ALL = STOPWORDS_UK | STOPWORDS_EN

SYNONYMS = {
    'js': 'javascript', 'ts': 'typescript',
    'k8s': 'kubernetes', 'node': 'nodejs', 'node.js': 'nodejs',
    'react.js': 'react', 'reactjs': 'react',
    'vue.js': 'vue', 'vuejs': 'vue',
    'next.js': 'nextjs', 'nuxt.js': 'nuxtjs',
    'pg': 'postgresql', 'postgres': 'postgresql',
    'mongo': 'mongodb', 'elastic': 'elasticsearch',
    'ml': 'machine learning', 'dl': 'deep learning',
    'nlp': 'natural language processing',
    'cv': 'computer vision',
    'llms': 'llm', 'rn': 'react native',
    'ci cd': 'ci/cd', 'cicd': 'ci/cd',
    'gh-actions': 'github actions', 'gha': 'github actions',
    'restful': 'rest api', 'restful api': 'rest api',
    'mui': 'materialui', 'tf': 'tensorflow',
    'sklearn': 'scikit-learn', 'sk': 'scikit-learn',
    'sb': 'springboot',
    # Українські → англійські
    'розробник': 'developer', 'розробниця': 'developer',
    'програмування': 'programming', 'програміст': 'programmer',
    'тестування': 'testing', 'тестувальник': 'tester',
    'дизайн': 'design', 'аналіз': 'analysis',
    'бд': 'database', 'хмара': 'cloud',
    'контейнер': 'container', 'мікросервіс': 'microservices',
    'комунікація': 'communication', 'спілкування': 'communication',
    'лідерство': 'leadership',
    'менеджмент': 'management', 'управління': 'management',
    'англ': 'english', 'нім': 'german', 'фр': 'french',
    'ексель': 'excel', 'ворд': 'word',
    'фотошоп': 'photoshop', 'фігма': 'figma',
    'досвід роботи': 'work experience',
    'вища освіта': 'higher education',
    'бакалавр': 'bachelor', 'магістр': 'master',
}

TECH_SKILLS = {
    # Languages
    'python', 'javascript', 'typescript', 'java', 'c#', 'c++', 'c', 'go', 'golang',
    'rust', 'swift', 'kotlin', 'scala', 'ruby', 'php', 'perl', 'r', 'matlab',
    'bash', 'shell', 'powershell', 'sql', 'nosql', 'html', 'css', 'sass', 'scss',
    'graphql', 'solidity', 'dart', 'lua', 'haskell', 'elixir', 'clojure', 'groovy',
    # Frontend
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxtjs', 'gatsby',
    'jquery', 'redux', 'mobx', 'zustand', 'pinia', 'vuex',
    'webpack', 'vite', 'parcel', 'rollup', 'esbuild',
    'babel', 'swc', 'eslint', 'prettier',
    'tailwind', 'bootstrap', 'materialui', 'antd', 'chakra',
    'storybook', 'webcomponents', 'pwa',
    'websocket', 'webassembly', 'wasm', 'webgl', 'threejs', 'd3',
    # Backend
    'nodejs', 'express', 'fastapi', 'flask', 'django', 'spring', 'springboot',
    'rails', 'laravel', 'symfony', 'nestjs', 'koa', 'gin',
    'celery', 'rabbitmq', 'kafka', 'nats',
    'grpc', 'rest', 'rest api', 'soap',
    'oauth', 'oauth2', 'jwt', 'openapi', 'swagger', 'openid',
    'protobuf', 'avro',
    # Databases
    'postgresql', 'mysql', 'sqlite', 'mssql', 'oracle', 'mariadb',
    'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
    'couchdb', 'neo4j', 'influxdb', 'clickhouse', 'snowflake', 'bigquery',
    'supabase', 'firebase', 'firestore',
    'prisma', 'sqlalchemy', 'hibernate', 'typeorm', 'sequelize', 'mongoose',
    'drizzle', 'gorm',
    'vector database', 'pinecone', 'weaviate', 'milvus', 'qdrant', 'chroma',
    # Cloud & DevOps
    'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'digitalocean',
    'docker', 'kubernetes', 'podman',
    'terraform', 'pulumi', 'ansible', 'puppet', 'chef',
    'jenkins', 'gitlab', 'github', 'github actions', 'circleci',
    'argocd', 'fluxcd', 'helm', 'kustomize', 'istio',
    'prometheus', 'grafana', 'loki', 'datadog', 'sentry',
    'nginx', 'apache', 'caddy', 'haproxy', 'traefik',
    'cloudflare', 'fastly',
    'ci/cd', 'gitops', 'devsecops', 'sre',
    'infrastructure as code', 'iac',
    # ML / AI
    'tensorflow', 'pytorch', 'keras', 'scikit-learn',
    'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly',
    'opencv', 'pillow',
    'transformers', 'huggingface', 'langchain', 'llamaindex',
    'openai', 'llm', 'bert', 'gpt', 't5', 'llama',
    'mlflow', 'wandb', 'airflow', 'prefect', 'dagster',
    'spark', 'hadoop', 'hive', 'flink', 'dask', 'ray',
    'xgboost', 'lightgbm', 'catboost',
    'machine learning', 'deep learning', 'computer vision',
    'natural language processing', 'data science',
    # Mobile
    'ios', 'android', 'react native', 'flutter', 'xamarin', 'ionic',
    'swiftui', 'uikit', 'jetpack compose', 'expo',
    # Testing
    'jest', 'pytest', 'unittest', 'mocha', 'chai', 'jasmine',
    'cypress', 'playwright', 'selenium', 'puppeteer',
    'testng', 'junit', 'xunit',
    'postman', 'insomnia', 'k6', 'jmeter', 'gatling', 'locust',
    # Architecture
    'microservices', 'monolith', 'serverless', 'event-driven',
    'ddd', 'cqrs', 'event sourcing', 'saga',
    'tdd', 'bdd', 'atdd', 'pair programming', 'code review',
    'mvc', 'mvvm', 'mvp', 'clean architecture', 'hexagonal',
    'solid', 'dry', 'kiss', 'design patterns',
    'api design', 'domain modeling', 'system design',
    # Security
    'cybersecurity', 'pentest', 'owasp', 'ssl', 'tls', 'encryption',
    'authentication', 'authorization', 'sso', 'ldap', 'saml', 'keycloak',
    'vault', 'secrets management', 'sast', 'dast', 'sonarqube',
    'zero trust', 'iam', 'rbac',
    # Data Engineering
    'data pipeline', 'etl', 'elt', 'data warehouse', 'data lake',
    'delta lake', 'apache iceberg', 'apache hudi',
    'kafka streams', 'flink sql',
    # GameDev
    'unity', 'unreal', 'godot', 'pygame',
    'opengl', 'vulkan', 'directx', 'webgpu',
    # Tools
    'git', 'svn', 'jira', 'confluence', 'notion', 'trello', 'linear',
    'figma', 'sketch', 'photoshop', 'illustrator', 'xd', 'zeplin',
    'linux', 'unix', 'vim', 'vscode', 'intellij',
    'makefile', 'cmake', 'bazel', 'gradle', 'maven',
    # Blockchain
    'blockchain', 'web3', 'ipfs', 'ethereum', 'hyperledger',
    'smart contracts', 'hardhat', 'foundry',
    'defi', 'nft',
    # IoT / Embedded
    'iot', 'embedded', 'rtos', 'freertos', 'zephyr',
    'raspberrypi', 'arduino', 'stm32', 'esp32',
    'mqtt', 'coap', 'zigbee', 'lora',
    # Integrations
    'webrtc', 'twilio', 'stripe', 'sendgrid',
    'segment', 'mixpanel', 'amplitude',
    'zapier', 'make', 'n8n',
}

SOFT_SKILLS = {
    'communication', 'комунікація',
    'teamwork', 'командна робота',
    'leadership', 'лідерство',
    'creativity', 'креативність',
    'adaptability', 'адаптивність',
    'responsibility', 'відповідальність',
    'initiative', 'ініціативність',
    'autonomy', 'самостійність',
    'organization', 'організованість',
    'punctuality', 'пунктуальність',
    'stress resistance', 'стресостійкість',
    'critical thinking', 'критичне мислення',
    'problem solving', 'вирішення проблем',
    'decision making', 'прийняття рішень',
    'public speaking', 'presentation skills',
    'negotiation', 'переговори',
    'empathy', 'emotional intelligence',
    'mentoring', 'coaching', 'наставництво',
    'facilitation', 'фасилітація',
    'time management', 'тайм-менеджмент',
    'multitasking', 'багатозадачність',
    'attention to detail', 'увага до деталей',
    'analytical thinking', 'аналітичне мислення',
    'flexibility', 'гнучкість',
    'patience', 'терплячість',
    'motivation', 'мотивація',
    'fast learner', 'швидке навчання',
    'self-learning', 'самонавчання',
    'documentation', 'written communication',
    'conflict resolution',
    'cross-functional collaboration',
    'ownership', 'accountability',
    'proactivity', 'результативність',
    'english', 'german', 'french', 'spanish', 'italian',
    'polish', 'ukrainian', 'chinese', 'japanese',
}

BUSINESS_SKILLS = {
    'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'six sigma', 'okr', 'kpi',
    'product management', 'product owner',
    'project management', 'program management',
    'business analysis', 'system analysis',
    'requirements gathering', 'user stories',
    'ux', 'ui', 'user research', 'usability testing', 'a/b testing',
    'analytics', 'web analytics', 'product analytics',
    'marketing', 'growth hacking', 'content marketing',
    'seo', 'sem', 'ppc', 'email marketing',
    'crm', 'erp', 'sap', 'salesforce', 'hubspot', 'zendesk',
    'financial analysis', 'budgeting', 'forecasting',
    'strategic planning', 'risk management',
    'stakeholder management', 'vendor management',
    'supply chain', 'logistics', 'procurement',
    'customer success', 'client relations', 'account management',
    'b2b', 'b2c', 'saas', 'paas', 'iaas',
    'data-driven', 'tableau', 'powerbi', 'looker', 'metabase', 'superset',
    'compliance', 'gdpr', 'hipaa', 'iso', 'itil',
    'pmp', 'prince2', 'safe',
    'change management', 'digital transformation',
    'go-to-market', 'market research', 'competitive analysis',
}


def tokenize(text: str) -> list:
    tokens = re.findall(r'[a-zа-яіїєґ][a-zа-яіїєґ0-9+#\.\-]*', text.lower())
    
    result = []
    for t in tokens:
        t = t.strip('.-_')
        if len(t) < 2:
            continue
        t = SYNONYMS.get(t, t)
        if t in STOPWORDS_ALL:
            continue
        result.append(t)
    
    return result


def is_stopword(word: str) -> bool:
    return word.lower().strip('.-_') in STOPWORDS_ALL


def normalize_word(word: str) -> str:
    w = word.lower().strip('.-_')
    if w in SYNONYMS:
        return SYNONYMS[w]
    return w


def extract_keywords(text: str, top_n: int = 15) -> list:
    from collections import Counter
    
    tokens = tokenize(text)
    freq = Counter(tokens)

    for i in range(len(tokens) - 1):
        bigram = f"{tokens[i]} {tokens[i+1]}"
        if bigram in TECH_SKILLS or bigram in SOFT_SKILLS or bigram in BUSINESS_SKILLS:
            freq[bigram] = freq.get(bigram, 0) + 2
    
    sorted_words = freq.most_common(top_n)
    return [{'word': w, 'stemmed': w} for w, _ in sorted_words]