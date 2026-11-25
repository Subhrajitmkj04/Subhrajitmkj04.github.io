/* ============================================================
   EDIT THIS FILE — everything on the site comes from here.
   Both versions (Play + Résumé) read the same data, so you only
   ever update things in one place.
   ============================================================ */
window.SITE = {
  profile: {
    name: "Subhrajit Mukherjee",
    role: "NLP Researcher · Cultural bias in LLMs & Indic NLP",
    location: "Kolkata, India",
    email: "subhrajitmukherjee04@gmail.com",
    summary:
      "I'm an undergraduate NLP researcher at Sister Nivedita University, Kolkata (BCA Honors with Research). I study how large language models represent culture, with a focus on Indic languages and Indian cultural and literary heritage. My work has appeared at the C3NLP Workshop at ACL 2026 and IEEE PuneCon 2026, and I currently research with labs at Sister Nivedita University, Jadavpur University and IIT Patna.",
    cv: "cv.pdf" // put your compiled CV next to index.html with this name
  },

  // Shown as buttons in the résumé header AND as the "Find me" section in the games.
  links: [
    { label: "GitHub",        url: "https://github.com/Subhrajitmkj04",                              note: "Code for my research and projects." },
    { label: "LinkedIn",      url: "https://www.linkedin.com/in/subhrajit-mkj/",                     note: "The professional version of me." },
    { label: "ACL Anthology", url: "https://aclanthology.org/people/subhrajit-mukherjee/unverified/", note: "My published papers." },
    { label: "Email",         url: "mailto:subhrajitmukherjee04@gmail.com",                          note: "subhrajitmukherjee04@gmail.com. The quickest way to reach me." },
    { label: "CV (PDF)",      url: "cv.pdf",                                                         note: "The one-page summary, if you're in a hurry." }
  ],

  experience: [
    {
      role: "Research Intern", org: "Dhrisha Lab, IIT Patna (under Dr. Sriparna Saha)", period: "Aug 2026 — Present",
      points: [
        "Developing an end-to-end multimodal framework that bridges highly metaphorical textual narratives and coherent visual storytelling."
      ]
    },
    {
      role: "Research Intern", org: "Jadavpur University (under Dr. Dipankar Das)", period: "May 2026 — Present",
      points: [
        "Contributing to NLP research on cultural and mechanistic biases in large language models, with a focus on Indic and cross-cultural contexts."
      ]
    },
    {
      role: "Student Researcher", org: "Aethersaga Lab, Sister Nivedita University", period: "Feb 2026 — Present",
      points: [
        "Co-authored “The Mirage of Diversity”, published at the C3NLP Workshop at ACL 2026.",
        "Applied statistical analysis and visualization to identify systematic gaps in LLM cultural coverage across language families."
      ]
    }
  ],

  projects: [
    {
      name: "Mahabharata Interpretable NER",
      blurb: "An interpretable named-entity recognition system for mythological entities in the Mahabharata corpus, with attention-based visualizations and evaluation adapted to domain-specific entity types.",
      tags: ["Python", "spaCy", "NumPy", "Pandas", "Matplotlib"],
      links: { repo: "", demo: "" }
    },
    {
      name: "ResumeX",
      blurb: "AI career copilot: reviews a résumé against a job description with Gemini. It gives an ATS score, skill gaps, honest bullet rewrites, a cover letter and interview prep.",
      tags: ["JavaScript", "Gemini", "LLM apps"],
      links: { repo: "https://github.com/Subhrajitmkj04/ResumeX", demo: "https://resumex-chi.vercel.app" }
    },
    {
      name: "Comparative Study of Lexical Algorithms",
      blurb: "Benchmarked One-Hot, Bag-of-Words and TF-IDF pipelines (with Logistic Regression) on 20 Newsgroups. TF-IDF reached 96.5% accuracy (F1 0.965) with the fastest fit time.",
      tags: ["Python", "Scikit-learn", "NLTK", "Seaborn"],
      links: { repo: "https://github.com/Subhrajitmkj04/A-Comparative-Study-of-Lexical-Algorithms-with-Visualizations", demo: "" }
    },
    {
      name: "Customer Churn Predictor with Explainability",
      blurb: "End-to-end churn prediction on the IBM Telco dataset: EDA, imbalance handling, Logistic Regression / Random Forest / XGBoost / neural net, and SHAP explanations.",
      tags: ["Python", "XGBoost", "SHAP", "Scikit-learn"],
      links: { repo: "https://github.com/Subhrajitmkj04/Customer-Churn-Predictor", demo: "" }
    },
    {
      name: "Mindvane",
      blurb: "A collaborative agentic IDE where agent memory is branchable, so you can fork, diff and merge what your agents know.",
      tags: ["Agents", "LLMs"],
      links: { repo: "", demo: "" }
    }
  ],

  papers: [
    {
      title: "The Mirage of Diversity: Unmasking the Cultural Vocabulary Ceiling in LLMs",
      authors: "Soumedhik Bharati, Subhrajit Mukherjee, Shibam Mandal",
      venue: "C3NLP Workshop, ACL 2026 · pp. 101–107", year: 2026,
      summary: "LLMs asked to adapt stories to a culture don't scale cultural vocabulary with text length; they hit a “Cultural Vocabulary Ceiling”. We introduce CSAI, a metric that penalizes stereotype-heavy, incoherent keyword insertion. Across Llama-3.1-8B, Gemma-2-9B and GPT-OSS-20B, CSAI is only 0.09–0.19 vs. 1.0 for human text.",
      links: { pdf: "https://aclanthology.org/2026.c3nlp-1.7.pdf", arxiv: "", page: "https://aclanthology.org/2026.c3nlp-1.7/" }
    },
    {
      title: "Named Entity Recognition in the Mahabharata using LLM-Generated Silver Annotations",
      authors: "",
      venue: "IEEE PuneCon 2026 (accepted)", year: 2026,
      summary: "Adapts a general-purpose spaCy NER model to the Mahabharata's culturally specific entities using only LLM-generated silver annotations across all 18 parvas: 81.1 micro span-F1 vs. 32.7 for the pretrained baseline (+48.4), with no human-annotated training data.",
      links: { pdf: "", arxiv: "" }
    }
  ],

  skills: {
    "Research areas": ["NLP", "Cultural bias in LLMs", "Low-resource Indic languages", "Code-mixed text", "Information retrieval", "Interpretability"],
    "Languages": ["Python", "Java", "C", "SQL", "JavaScript (ES6+)"],
    "ML / NLP": ["PyTorch", "TensorFlow", "Hugging Face", "Unsloth", "spaCy", "Scikit-learn", "NumPy", "Pandas", "Matplotlib", "Seaborn"],
    "Web & data": ["React", "HTML5", "CSS3", "Supabase", "Firebase"],
    "Tools": ["Git / GitHub", "LaTeX", "Power BI", "Basic CI/CD"]
  },

  education: [
    { degree: "Bachelor of Computer Applications (Honors with Research)", school: "Sister Nivedita University, Kolkata", period: "2023 — Present", note: "CGPA 7.68 / 10" }
  ],

  // Your story, in order. Shown as the résumé timeline and the "My journey" section in the games.
  journey: [
    { year: "2023", title: "Started at Sister Nivedita University", text: "Began a BCA (Honors with Research) in Kolkata." },
    { year: "2025", title: "First data projects", text: "Got hands-on with data: exploratory analysis in NumPy and Pandas and a Netflix Power BI dashboard." },
    { year: "Feb 2026", title: "Joined Aethersaga Lab", text: "Started research on how LLMs represent culture across language families." },
    { year: "May 2026", title: "Research at Jadavpur University", text: "Began working with Dr. Dipankar Das on cultural and mechanistic biases in LLMs." },
    { year: "Jul 2026", title: "First paper at ACL", text: "“The Mirage of Diversity” published at the C3NLP Workshop, ACL 2026." },
    { year: "Aug 2026", title: "Joined Dhrisha Lab, IIT Patna", text: "Building a multimodal framework that turns metaphorical narratives into visual stories, with Dr. Sriparna Saha." },
    { year: "2026", title: "Mahabharata NER accepted", text: "Paper on NER from LLM-generated silver annotations accepted at IEEE PuneCon 2026." }
  ],

  // PLAY VERSION
  // Every game is split into these stages, played in this order.
  // Each collectible in a stage reveals ONE entry from its `source` list
  // (one milestone, one paper, one job, one skill group, one link…).
  sections: [
    { title: "My journey", source: "journey" },
    { title: "Research",   source: "papers" },
    { title: "Experience", source: "experience" },
    { title: "Projects",   source: "projects" },
    { title: "Education",  source: "education" },
    { title: "Skills",     source: "skills" },
    { title: "Find me",    source: "links" }
  ],

  // The games visitors can pick from (all open, any order).
  // game: platformer · stacker · maze · moto · rally
  // theme: dawn · dusk · forest · night · synth
  games: [
    { name: "Platform Run", blurb: "Run, jump, stomp bugs",    game: "platformer", theme: "dawn"   },
    { name: "Skyline",      blurb: "Stack a skyscraper",       game: "stacker",    theme: "dusk"   },
    { name: "The Maze",     blurb: "Eat dots, dodge glitches", game: "maze",       theme: "night"  },
    { name: "Fast Lane",    blurb: "Bike race with a brawl",   game: "moto",       theme: "forest" },
    { name: "Victory Lap",  blurb: "Drift through the rings",  game: "rally",      theme: "synth"  }
  ]
};
