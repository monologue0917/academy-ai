-- ============================================================================
-- Academy AI - Seed Data (개발/테스트용)
-- ============================================================================

-- 1. 학원 생성
INSERT INTO academies (id, name, code) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ACE ENGLISH', '2749'),
    ('a0000000-0000-0000-0000-000000000002', '영어마스터학원', '1234');

-- 2. 사용자 생성 (선생님)
INSERT INTO users (id, academy_id, email, name, role) VALUES
    ('u0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'teacher@ace.com', '김선생', 'teacher'),
    ('u0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'teacher@master.com', '이선생', 'teacher');

-- 3. 사용자 생성 (학생)
INSERT INTO users (id, academy_id, name, role, phone) VALUES
    ('u0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', '김민준', 'student', '010-1234-5678'),
    ('u0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', '이서연', 'student', '010-2345-6789'),
    ('u0000000-0000-0000-0000-000000000103', 'a0000000-0000-0000-0000-000000000001', '박지호', 'student', '010-3456-7890'),
    ('u0000000-0000-0000-0000-000000000104', 'a0000000-0000-0000-0000-000000000001', '정수아', 'student', '010-4567-8901');

-- 4. 반 생성
INSERT INTO classes (id, academy_id, teacher_id, name, description, schedule, color) VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        '고3 수능반',
        '수능 영어 집중 대비반',
        '[{"day":"월","startTime":"19:00","endTime":"21:00","room":"B-203","note":"Reading"},{"day":"수","startTime":"19:00","endTime":"21:00","room":"B-203","note":"Grammar"},{"day":"금","startTime":"19:00","endTime":"21:30","room":"B-203","note":"모의고사"}]',
        '#4F46E5'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        '고2 내신반',
        '내신 영어 대비반',
        '[{"day":"화","startTime":"18:00","endTime":"20:00","room":"B-201"},{"day":"목","startTime":"18:00","endTime":"20:00","room":"B-201"}]',
        '#10B981'
    );

-- 5. 학생 반 등록
INSERT INTO class_enrollments (class_id, student_id) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000101'),
    ('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000102'),
    ('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000103'),
    ('c0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000104');

-- 6. 문제 생성 (영어 문제 예시)
INSERT INTO questions (id, academy_id, created_by, type, content, passage, options, correct_answer, explanation, points, category, difficulty, tags, source) VALUES
    -- 빈칸추론 문제
    (
        'q0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'The author implies that the key to success lies in ________.',
        'Success is not merely about talent or luck. It requires consistent effort and the ability to learn from failures. Those who achieve greatness often share one common trait: they view obstacles not as barriers, but as opportunities for growth.',
        '["natural ability", "persistent dedication", "financial resources", "social connections", "fortunate circumstances"]',
        '2',
        '지문에서 "consistent effort"와 "learn from failures"가 핵심 키워드입니다. 성공의 열쇠는 타고난 능력이 아닌 끈기 있는 헌신임을 알 수 있습니다.',
        3,
        '빈칸추론',
        'medium',
        ARRAY['독해', '추론', '수능형'],
        '자체 제작'
    ),
    -- 주제파악 문제
    (
        'q0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'What is the main topic of the passage?',
        'Climate change affects ecosystems in numerous ways. Rising temperatures alter migration patterns of birds, while changing precipitation levels impact plant growth cycles. Marine ecosystems face acidification, threatening coral reefs and the species that depend on them.',
        '["Bird migration patterns", "Ocean acidification", "Environmental impacts of climate change", "Plant growth cycles", "Coral reef preservation"]',
        '3',
        '지문 전체가 기후 변화의 다양한 환경적 영향에 대해 설명하고 있습니다. 개별 예시(새, 식물, 해양)는 주제를 뒷받침하는 세부사항입니다.',
        2,
        '주제파악',
        'easy',
        ARRAY['독해', '주제', '환경'],
        '자체 제작'
    ),
    -- 문법 문제
    (
        'q0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'Choose the grammatically correct sentence.',
        NULL,
        '["He suggested me to go there.", "He suggested that I go there.", "He suggested me going there.", "He suggested I to go there.", "He suggested for me to go there."]',
        '2',
        'suggest는 that절에서 동사원형(should + 동사원형에서 should 생략)을 사용합니다. "suggest that + 주어 + 동사원형" 패턴입니다.',
        2,
        '문법',
        'medium',
        ARRAY['문법', 'suggest', '가정법'],
        '자체 제작'
    ),
    -- 어휘 문제
    (
        'q0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'The word "ubiquitous" in the passage is closest in meaning to:',
        'Smartphones have become ubiquitous in modern society. You can find them in the hands of people from all walks of life, in every corner of the globe.',
        '["rare", "expensive", "widespread", "complicated", "dangerous"]',
        '3',
        'ubiquitous는 "어디에나 있는, 아주 흔한"이라는 뜻입니다. 지문에서 "모든 계층, 전 세계 구석구석"이라는 표현이 이를 뒷받침합니다.',
        2,
        '어휘',
        'medium',
        ARRAY['어휘', '동의어'],
        '자체 제작'
    ),
    -- 순서배열 문제
    (
        'q0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'Choose the correct order of the sentences.',
        '(A) However, this convenience comes with environmental costs.
(B) Online shopping has revolutionized how we purchase goods.
(C) Therefore, many companies are now exploring eco-friendly packaging options.
(D) The packaging materials used for shipping create significant waste.',
        '["(A)-(B)-(C)-(D)", "(B)-(A)-(D)-(C)", "(B)-(D)-(A)-(C)", "(D)-(B)-(A)-(C)", "(A)-(D)-(B)-(C)"]',
        '2',
        '(B) 온라인 쇼핑 소개 → (A) However로 연결되는 문제점 → (D) 구체적인 문제(포장재) → (C) Therefore로 연결되는 해결책',
        3,
        '순서배열',
        'hard',
        ARRAY['독해', '순서', '논리'],
        '자체 제작'
    ),
    -- 문장삽입 문제
    (
        'q0000000-0000-0000-0000-000000000006',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'Where does the following sentence best fit in the passage?

"This is particularly evident in urban areas."',
        '( ① ) Air pollution has become a major health concern worldwide. ( ② ) Studies show that long-term exposure to polluted air increases the risk of respiratory diseases. ( ③ ) City dwellers often face higher levels of harmful particles from vehicle emissions and industrial activities. ( ④ ) Governments are implementing stricter regulations to address this issue.',
        '["①", "②", "③", "④", "None of the above"]',
        '2',
        '삽입 문장은 "도시 지역에서 특히"라는 내용이므로, ②번 뒤(도시 거주자에 대한 언급 전)에 위치해야 자연스럽습니다.',
        3,
        '문장삽입',
        'hard',
        ARRAY['독해', '삽입', '응집성'],
        '자체 제작'
    ),
    -- 단답형 문제
    (
        'q0000000-0000-0000-0000-000000000007',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'short_answer',
        'Fill in the blank with the appropriate word: "She has been working here _____ 2020."',
        NULL,
        NULL,
        'since',
        '특정 시점을 나타낼 때는 since를 사용합니다. for는 기간(예: for 5 years)과 함께 사용합니다.',
        1,
        '문법',
        'easy',
        ARRAY['문법', '전치사', '시제'],
        '자체 제작'
    ),
    -- 추가 문제들 (총 10개 이상)
    (
        'q0000000-0000-0000-0000-000000000008',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'According to the passage, what can be inferred about the researchers?',
        'The team of researchers spent five years collecting data from remote villages. Despite numerous setbacks, including funding cuts and equipment failures, they persisted in their mission. Their findings ultimately changed our understanding of traditional medicine.',
        '["They gave up when facing difficulties.", "They were well-funded throughout.", "They showed remarkable determination.", "They focused only on urban areas.", "They completed research in one year."]',
        '3',
        '"Despite numerous setbacks...they persisted"에서 연구자들의 끈기와 결단력을 추론할 수 있습니다.',
        2,
        '추론',
        'medium',
        ARRAY['독해', '추론'],
        '자체 제작'
    ),
    (
        'q0000000-0000-0000-0000-000000000009',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'Which of the following is NOT mentioned in the passage?',
        'The ancient library contained thousands of scrolls covering topics from philosophy to astronomy. Scholars from distant lands would travel for months to access its collections. The library also housed a museum and a botanical garden.',
        '["Philosophy texts", "Astronomy documents", "International visitors", "A botanical garden", "Medical research facilities"]',
        '5',
        '지문에는 철학, 천문학, 먼 곳에서 온 학자들, 박물관, 식물원이 언급되어 있지만, 의료 연구 시설은 언급되지 않았습니다.',
        2,
        '세부정보',
        'easy',
        ARRAY['독해', '세부정보', 'NOT'],
        '자체 제작'
    ),
    (
        'q0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'mcq',
        'What is the purpose of this passage?',
        'Are you tired of spending hours in traffic? Our new electric scooter offers a revolutionary solution. With zero emissions, foldable design, and a range of 30 miles, it is perfect for urban commuters. Order now and get 20% off!',
        '["To inform about traffic problems", "To advertise a product", "To explain electric vehicle technology", "To discuss urban planning", "To compare transportation methods"]',
        '2',
        '지문의 구조(문제 제기 → 해결책 제시 → 혜택 나열 → 구매 유도)는 전형적인 광고 글입니다.',
        2,
        '글의목적',
        'easy',
        ARRAY['독해', '목적', '광고'],
        '자체 제작'
    );

-- 7. 시험 생성
INSERT INTO exams (id, academy_id, class_id, created_by, title, description, duration, scheduled_at, due_at, status) VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        '9월 모의고사 독해 파트',
        '수능 독해 영역 집중 연습',
        40,
        NOW() + INTERVAL '2 hours',
        NOW() + INTERVAL '1 day',
        'published'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        '주간 테스트 - 문법',
        '이번 주 배운 문법 내용 확인',
        30,
        NOW() + INTERVAL '3 days',
        NOW() + INTERVAL '4 days',
        'published'
    );

-- 8. 시험-문제 매핑
INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000001', 1),
    ('e0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000002', 2),
    ('e0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000005', 3),
    ('e0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000006', 4),
    ('e0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000008', 5),
    ('e0000000-0000-0000-0000-000000000002', 'q0000000-0000-0000-0000-000000000003', 1),
    ('e0000000-0000-0000-0000-000000000002', 'q0000000-0000-0000-0000-000000000007', 2);

-- 9. 숙제 생성
INSERT INTO homeworks (id, academy_id, class_id, created_by, title, description, due_at, status) VALUES
    (
        'h0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'EBS 변형 세트 Day 5',
        'EBS 연계 지문 변형 문제',
        NOW() + INTERVAL '4 hours',
        'published'
    ),
    (
        'h0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        '문법 Sprint Week 3',
        '관계대명사, 분사구문 집중 연습',
        NOW() + INTERVAL '6 hours',
        'published'
    );

-- 10. 숙제-문제 매핑
INSERT INTO homework_questions (homework_id, question_id, order_index) VALUES
    ('h0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000001', 1),
    ('h0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000002', 2),
    ('h0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000004', 3),
    ('h0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000008', 4),
    ('h0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000009', 5),
    ('h0000000-0000-0000-0000-000000000002', 'q0000000-0000-0000-0000-000000000003', 1),
    ('h0000000-0000-0000-0000-000000000002', 'q0000000-0000-0000-0000-000000000007', 2);

-- 11. 시험 할당
INSERT INTO exam_assignments (exam_id, student_id, status) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000101', 'pending'),
    ('e0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000102', 'pending'),
    ('e0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000103', 'pending'),
    ('e0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000101', 'pending'),
    ('e0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000102', 'in_progress');

-- 12. 숙제 할당
INSERT INTO homework_assignments (homework_id, student_id, due_at, status) VALUES
    ('h0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000101', NOW() + INTERVAL '4 hours', 'in_progress'),
    ('h0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000102', NOW() + INTERVAL '4 hours', 'pending'),
    ('h0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000103', NOW() + INTERVAL '4 hours', 'submitted'),
    ('h0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000101', NOW() + INTERVAL '6 hours', 'pending'),
    ('h0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000102', NOW() + INTERVAL '6 hours', 'pending');

-- 13. 샘플 제출 데이터 (과거 테스트 결과)
INSERT INTO submissions (id, type, exam_id, student_id, started_at, submitted_at, time_spent, score, max_score, percentage) VALUES
    (
        's0000000-0000-0000-0000-000000000001',
        'exam',
        'e0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000103',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days' + INTERVAL '35 minutes',
        2100,
        10,
        13,
        76.92
    );

-- 14. 샘플 답안
INSERT INTO submission_answers (submission_id, question_id, answer, is_correct, earned_points, max_points) VALUES
    ('s0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000001', '2', true, 3, 3),
    ('s0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000002', '3', true, 2, 2),
    ('s0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000005', '3', false, 0, 3),
    ('s0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000006', '2', true, 3, 3),
    ('s0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000008', '1', false, 0, 2);

-- 15. 오답 노트
INSERT INTO wrong_notes (student_id, question_id, submission_type, submission_id, student_answer, correct_answer, review_count) VALUES
    ('u0000000-0000-0000-0000-000000000103', 'q0000000-0000-0000-0000-000000000005', 'exam', 's0000000-0000-0000-0000-000000000001', '3', '2', 0),
    ('u0000000-0000-0000-0000-000000000103', 'q0000000-0000-0000-0000-000000000008', 'exam', 's0000000-0000-0000-0000-000000000001', '1', '3', 0);

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
