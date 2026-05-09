"""
Лінгвістичні дані для NLP аналізу резюме.
Універсальний набір для будь-яких професій.
Без російської мови.
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
    'можна', 'треба', 'варто', 'слід', 'мабуть', 'напевно',
    'тобто', 'наприклад', 'зокрема', 'особливо',
    'б', 'би', 'ж', 'же', 'от', 'то', 'чи', 'хіба', 'невже',
    'поки', 'доки', 'щойно', 'ледве', 'тільки-но',
    'ніби', 'наче', 'неначе', 'мов', 'немов',
    'досить', 'доволі', 'надто', 'занадто',
    'всередині', 'навколо', 'поруч', 'поблизу',
    'протягом', 'впродовж', 'наприкінці', 'спочатку',
    'необхідно', 'обов\'язково', 'бажано',
    'комерційний', 'комерційна', 'комерційне', 'комерційні',
    'глибокий', 'глибока', 'глибоке', 'глибокі',
    'широкий', 'широка', 'широке', 'широкі',
    'великий', 'велика', 'велике', 'великі',
    'років', 'роки', 'рік', 'місяців', 'місяць', 'місяці',
    'вища', 'середня', 'спеціальна',
    'повний', 'повна', 'повне', 'повні',
}

STOPWORDS_EN = {
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'shall', 'must', 'need', 'dare', 'ought',
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
    'still', 'yet', 'already', 'even', 'ever', 'never',
    'looking', 'seeking', 'candidate', 'position', 'company', 'role',
    'experience', 'work', 'team', 'good', 'strong',
    'able', 'ability', 'must', 'plus', 'bonus',
    'new', 'using', 'working', 'within',
    'years', 'year', 'months', 'month',
    'required', 'requirements', 'qualifications',
    'deep', 'broad', 'extensive',
}

STOPWORDS_ALL = STOPWORDS_UK | STOPWORDS_EN

SYNONYMS = {
    # Загальні скорочення
    'it': 'information technology',
    'hr': 'human resources',
    'pr': 'public relations',
    'r&d': 'research and development',
    'b2b': 'business to business',
    'b2c': 'business to consumer',
    'ceo': 'chief executive officer',
    'cto': 'chief technology officer',
    'cfo': 'chief financial officer',
    'coo': 'chief operating officer',
    'cmo': 'chief marketing officer',
    'vp': 'vice president',
    'pm': 'project manager',
    'po': 'product owner',
    'qa': 'quality assurance',
    'ui': 'user interface',
    'ux': 'user experience',
    'kpi': 'key performance indicator',
    'okr': 'objectives and key results',
    'sla': 'service level agreement',
    'nda': 'non disclosure agreement',

    # Освіта
    'phd': 'doctor of philosophy',
    'ph.d': 'doctor of philosophy',
    'mba': 'master of business administration',
    'msc': 'master of science',
    'ma': 'master of arts',
    'ba': 'bachelor of arts',
    'bs': 'bachelor of science',
    'bsc': 'bachelor of science',
    'md': 'doctor of medicine',
    'jd': 'juris doctor',
    'cpa': 'certified public accountant',
    'cfa': 'chartered financial analyst',
    'pmp': 'project management professional',
    'csm': 'certified scrum master',

    # Мови
    'eng': 'english',
    'англ': 'english',
    'укр': 'ukrainian',
    'de': 'german',
    'нім': 'german',
    'fr': 'french',
    'фр': 'french',
    'esp': 'spanish',
    'ісп': 'spanish',
    'pl': 'polish',
    'пол': 'polish',
    'італ': 'italian',

    # Загальні терміни
    'комунікація': 'communication',
    'спілкування': 'communication',
    'переговори': 'negotiation',
    'презентація': 'presentation',
    'звітність': 'reporting',
    'документація': 'documentation',
    'управління': 'management',
    'менеджмент': 'management',
    'керування': 'management',
    'адміністрування': 'administration',
    'координація': 'coordination',
    'організація': 'organization',
    'планування': 'planning',
    'бюджетування': 'budgeting',
    'аналіз': 'analysis',
    'аналітика': 'analytics',
    'дослідження': 'research',
    'розробка': 'development',
    'впровадження': 'implementation',
    'оптимізація': 'optimization',
    'автоматизація': 'automation',
    'навчання': 'training',
    'менторство': 'mentoring',
    'консультування': 'consulting',
    'продажі': 'sales',
    'маркетинг': 'marketing',
    'реклама': 'advertising',
    'брендинг': 'branding',
    'логістика': 'logistics',
    'постачання': 'supply chain',
    'закупівлі': 'procurement',
    'фінанси': 'finance',
    'бухгалтерія': 'accounting',
    'аудит': 'audit',
    'оподаткування': 'taxation',
    'юриспруденція': 'law',
    'право': 'law',
    'договори': 'contracts',

    # Софт-скіли
    'лідерство': 'leadership',
    'відповідальність': 'responsibility',
    'ініціативність': 'initiative',
    'креативність': 'creativity',
    'стресостійкість': 'stress resistance',
    'багатозадачність': 'multitasking',
    'пунктуальність': 'punctuality',
    'дисциплінованість': 'discipline',
    'самоорганізація': 'self organization',
    'командна робота': 'teamwork',
    'робота в команді': 'teamwork',
    'критичне мислення': 'critical thinking',
    'вирішення проблем': 'problem solving',
    'адаптивність': 'adaptability',
    'гнучкість': 'flexibility',
    'уважність': 'attention to detail',
    'орієнтація на результат': 'result oriented',

    # Інструменти (загальні)
    'ексель': 'excel',
    'ворд': 'word',
    'паверпоінт': 'powerpoint',
    'аутлук': 'outlook',
    'трелло': 'trello',
    'асана': 'asana',
    'джира': 'jira',
    'слек': 'slack',
    'зум': 'zoom',
    'тімс': 'teams',
    'ноушн': 'notion',
    'майро': 'miro',
    'фігма': 'figma',
    'канва': 'canva',
    'фотошоп': 'photoshop',
    'ілюстратор': 'illustrator',
    'індизайн': 'indesign',

    # Освіта та сертифікати
    'вища освіта': 'higher education',
    'бакалавр': 'bachelor',
    'магістр': 'master',
    'спеціаліст': 'specialist',
    'аспірант': 'phd student',
    'сертифікат': 'certificate',
    'диплом': 'diploma',
    'курси': 'courses',
    'тренінг': 'training',
    'семінар': 'seminar',
    'вебінар': 'webinar',
    'стажування': 'internship',
    'практика': 'practice',

    # Досвід роботи
    'досвід роботи': 'work experience',
    'стаж': 'experience',
    'кар\'єра': 'career',
    'посада': 'position',
    'працевлаштування': 'employment',
    'сумісництво': 'part time',
    'повна зайнятість': 'full time',
    'віддалена робота': 'remote work',
    'фріланс': 'freelance',
    'гібрид': 'hybrid',

    # Володіння
    'знання': 'knowledge',
    'навички': 'skills',
    'вміння': 'abilities',
    'компетенції': 'competencies',
    'кваліфікація': 'qualification',
    'спеціалізація': 'specialization',
    'професія': 'profession',
}

TECH_SKILLS = {
    # Web development
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'vuejs',
    'nodejs', 'node', 'express', 'django', 'flask', 'spring', 'springboot',
    'nextjs', 'next', 'nuxtjs', 'nuxt', 'gatsby', 'svelte', 'jquery',
    'html', 'html5', 'css', 'css3', 'scss', 'sass', 'less',
    'webpack', 'babel', 'vite', 'npm', 'yarn', 'pnpm',

    # Mobile
    'flutter', 'swift', 'kotlin', 'android', 'ios', 'reactnative',
    'xamarin', 'ionic',

    # Backend & Database
    'rest', 'restful', 'graphql', 'grpc', 'soap', 'websocket',
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo',
    'redis', 'elasticsearch', 'cassandra', 'dynamodb',
    'firebase', 'supabase', 'prisma', 'sequelize', 'mongoose',

    # DevOps & Cloud
    'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'googlecloud',
    'terraform', 'ansible', 'puppet', 'chef',
    'jenkins', 'github', 'githubactions', 'gitlab', 'gitlabci',
    'bitbucket', 'circleci', 'travisci',
    'prometheus', 'grafana', 'elk', 'datadog', 'newrelic',
    'nginx', 'apache', 'haproxy',

    # Languages
    'c++', 'c#', 'dotnet', '.net', 'ruby', 'rubyonrails', 'rails',
    'php', 'laravel', 'symfony', 'go', 'golang', 'rust',
    'scala', 'elixir', 'haskell', 'clojure',

    # Data & AI
    'machinelearning', 'deeplearning', 'nlp', 'computervision',
    'tensorflow', 'pytorch', 'keras', 'scikitlearn',
    'pandas', 'numpy', 'spark', 'hadoop', 'kafka', 'rabbitmq',
    'tableau', 'powerbi', 'looker',

    # Design
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
    'indesign', 'aftereffects', 'premiere',
    'zeplin', 'invision', 'marvelapp',

    # Other tech
    'git', 'linux', 'unix', 'bash', 'shell', 'powershell',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'testing', 'unittest', 'integrationtest', 'e2e',
    'selenium', 'cypress', 'jest', 'mocha', 'chai',
    'microservices', 'serverless', 'api', 'sdk',
}

SOFT_SKILLS = {
    'communication', 'teamwork', 'leadership', 'management',
    'english', 'german', 'french', 'spanish', 'italian',
    'polish', 'ukrainian', 'chinese', 'japanese',
    'analytical', 'creative', 'problemsolving', 'criticalthinking',
    'adaptability', 'flexibility', 'timemanagement',
    'presentation', 'negotiation', 'conflictresolution',
    'mentoring', 'coaching', 'facilitation',
    'emotionalintelligence', 'empathy',
    'decisionmaking', 'strategicthinking',
    'attentiontodetail', 'organized', 'detailoriented',
    'selfmotivated', 'proactive', 'initiative',
    'collaboration', 'interpersonal',
    'writing', 'publicspeaking', 'storytelling',
    'projectmanagement', 'productmanagement',
    'customerservice', 'clientrelations',
    'sales', 'marketing', 'branding',
    'research', 'analysis', 'reporting',
}

BUSINESS_SKILLS = {
    'finance', 'accounting', 'audit', 'tax',
    'budgeting', 'forecasting', 'financialmodeling',
    'riskmanagement', 'compliance', 'regulatory',
    'strategy', 'businessdevelopment', 'operations',
    'supplychain', 'logistics', 'procurement',
    'inventory', 'warehouse', 'distribution',
    'quality', 'sixsigma', 'lean', 'iso',
    'hr', 'recruiting', 'onboarding', 'training',
    'payroll', 'benefits', 'compensation',
    'legal', 'contract', 'intellectualproperty',
    'realestate', 'construction', 'architecture',
    'healthcare', 'medical', 'pharmaceutical',
    'education', 'teaching', 'curriculum',
    'nonprofit', 'fundraising', 'grantwriting',
}


def tokenize(text: str) -> list:
    tokens = re.findall(
        r'[a-zа-яёіїєґ][a-zа-яёіїєґ0-9+#\.\-]*',
        text.lower()
    )
    
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


def classify_skill(word: str) -> str:
    if word in TECH_SKILLS:
        return 'tech'
    if word in SOFT_SKILLS:
        return 'soft'
    if word in BUSINESS_SKILLS:
        return 'business'
    return 'other'


def extract_keywords(text: str, top_n: int = 15) -> list:
    tokens = tokenize(text)
    
    freq = {}
    
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    
    for i in range(len(tokens) - 1):
        bigram = f"{tokens[i]} {tokens[i+1]}"
        freq[bigram] = freq.get(bigram, 0) + 1.5
    
    sorted_words = sorted(freq.items(), key=lambda x: -x[1])[:top_n]
    
    return [{'word': w, 'stemmed': w} for w, _ in sorted_words]