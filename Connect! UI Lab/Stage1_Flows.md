# Connect! — Stage 1 核心流程图

> 基于已确定的 Stage 1 设计决策（pull-based 匹配、Doha 单城、低摩擦优先）
> 更新日期：2026-05-25

---

## 1. 玩家匹配流程（Pull-based Join）

核心理念：玩家自己挑比赛，host 不审核。Discover 卡片上直接 Join，无独立 pre-join detail 页。

```mermaid
flowchart TD
    Start([玩家打开 App]) --> Home{是否首次登录?}
    Home -- 是 --> FT[First-timer Home<br/>Discover feed]
    Home -- 否 --> PH[Player Home<br/>Next up + This week]

    FT --> Discover[浏览 Discover Feed<br/>显示开放比赛卡片]
    PH --> Discover

    Discover --> Filter{筛选?<br/>运动 / 时间 / 等级}
    Filter -- 调整 --> Discover
    Filter -- 找到合适 --> Card[查看比赛卡片<br/>时间·场地·等级·人数]

    Card --> Decision{要加入吗?}
    Decision -- 否 --> Discover
    Decision -- 是 --> TapJoin[点击 Join 按钮]

    TapJoin --> Check{名额是否已满?}
    Check -- 已满 --> Full[提示已满 + 推荐相似比赛]
    Full --> Discover
    Check -- 有名额 --> Joined[加入成功]

    Joined --> Confirm[Toast: You're in!<br/>添加到日历选项]
    Confirm --> NextUp[返回 Player Home<br/>新加入的比赛显示在 NEXT UP 卡片]
    NextUp --> End([比赛日见])

    style TapJoin fill:#FFE57F,stroke:#333,stroke-width:2px
    style Joined fill:#A5D6A7,stroke:#333,stroke-width:2px
    style NextUp fill:#A5D6A7,stroke:#333,stroke-width:2px
```

**关键设计点：**
- 没有 host 审核环节，Join 即加入
- NEXT UP 卡片就是 post-join 的 match detail 视图
- 满员降级体验：推荐相似比赛，不让用户走死路

---

## 2. 用户注册 / Onboarding 流程

5 步问卷：Role → Sport → Level → Country → City，结尾 "You're all set"。

```mermaid
flowchart TD
    Start([首次打开 App]) --> Splash[Splash 启动屏]
    Splash --> Lang[语言切换<br/>EN / عربي]
    Lang --> Auth{选择方式}

    Auth -- 已有账号 --> Login[Login<br/>邮箱 / 社交登录]
    Auth -- 新用户 --> SignUp[Sign Up<br/>邮箱 / 社交注册]

    Login --> Verify1{凭证有效?}
    Verify1 -- 否 --> LoginErr[错误提示] --> Login
    Verify1 -- 是 --> EnterApp

    SignUp --> Verify2{注册成功?}
    Verify2 -- 否 --> SignUpErr[错误提示] --> SignUp
    Verify2 -- 是 --> Q1

    Q1[Step 1 / 5<br/>Role：Player / Coach]
    Q1 --> Q2[Step 2 / 5<br/>Sport：Padel / Tennis / ...]
    Q2 --> Q3[Step 3 / 5<br/>Level：Beginner → Pro]
    Q3 --> Q4[Step 4 / 5<br/>Country]
    Q4 --> Q5[Step 5 / 5<br/>City]
    Q5 --> Done["You're all set 🎉"]

    Done --> EnterApp[进入 First-timer Home<br/>Discover feed]
    EnterApp --> End([开始浏览比赛])

    style Q1 fill:#BBDEFB,stroke:#333
    style Q2 fill:#BBDEFB,stroke:#333
    style Q3 fill:#BBDEFB,stroke:#333
    style Q4 fill:#BBDEFB,stroke:#333
    style Q5 fill:#BBDEFB,stroke:#333
    style Done fill:#A5D6A7,stroke:#333,stroke-width:2px
```

**关键设计点：**
- 每一步都可返回（progress 指示器）
- City 字段是 Stage 1 的隐性"附近"过滤器，不需要 geolocation
- RTL 适配在每一屏都要预留

---

## 3. 创建比赛流程（Host a Match）

```mermaid
flowchart TD
    Start([Player Home]) --> CTA[点击 Host one /<br/>+ Create Match]
    CTA --> Form["Let's set up your match"]

    Form --> F1[选择运动 Sport]
    F1 --> F2[选择日期 + 时间]
    F2 --> F3[选择场地 Venue]
    F3 --> F4[设置等级 Level]
    F4 --> F5[设置人数上限<br/>+ 自动占 1 个名额]
    F5 --> F6[添加备注 / 费用分摊<br/>可选]

    F6 --> Review{检查信息?}
    Review -- 需要修改 --> Form
    Review -- 确认 --> Submit[点击 Create]

    Submit --> Validate{字段齐全?}
    Validate -- 否 --> FieldErr[高亮缺失字段] --> Form
    Validate -- 是 --> Created["Your match is set to go ✓"]

    Created --> Share[展示 Share Link<br/>+ Add to calendar]
    Share --> Discover[比赛自动出现在<br/>Discover Feed 等待玩家加入]
    Discover --> Hosting[Player Home 显示<br/>You're hosting 卡片]

    Hosting --> Manage{后续操作}
    Manage -- 修改 --> Edit[Edit Match<br/>Changes Saved toast]
    Manage -- 取消 --> Cancel[Cancel Match<br/>Match Cancelled toast]
    Manage -- 等待开赛 --> End([比赛日到来])

    Edit --> Hosting
    Cancel --> Notify[通知所有已加入玩家] --> End2([流程结束])

    style Created fill:#A5D6A7,stroke:#333,stroke-width:2px
    style Discover fill:#FFE57F,stroke:#333,stroke-width:2px
    style Cancel fill:#EF9A9A,stroke:#333
```

**关键设计点：**
- 创建即开放：无审核环节，发布后立刻进入 Discover
- Host 自动占 1 个名额（默认参赛）
- 取消时主动通知所有已加入玩家——是建立信任的关键

---

## 4. Profile + Settings 分支

核心理念：从 Home 进入个人分支后，**"Save changes" 类提交动作**完成后自动返回 Home（配合 Toast 确认）；**inline 切换**（语言、通知、生物识别开关）就地生效，不导航。
目的：让玩家更新完信息后立刻回到 playing loop，而不是停留在设置层。

```mermaid
flowchart TD
    Home([Player Home]) --> Avatar[点击右上头像]
    Avatar --> Settings[Settings 主屏]

    Settings --> AvatarBlock{顶部头像区域}
    AvatarBlock -- View profile --> Profile[Player Profile<br/>只读视图<br/>统计 · 位置 · Bio]
    AvatarBlock -- Edit profile --> EditProfile

    Settings --> Account{ACCOUNT 区}
    Account --> Payment[Payment<br/>Cards · wallet · refunds]
    Account --> Privacy[Privacy<br/>Profile visibility · sharing]
    Account --> LangToggle[Language<br/>EN ⇄ عربي]

    Settings --> Security{SECURITY & ALERTS 区}
    Security --> PushToggle[Push notifications<br/>开关]
    Security --> BioToggle[Biometric login<br/>开关]

    Settings --> Support[SUPPORT & INFO<br/>Safety · About Connect]

    Profile --> Pencil[点击铅笔图标]
    Pencil --> EditProfile[Edit Profile<br/>Identity · Country · Sports & Level]

    %% 提交型动作 → Save → Home + Toast
    EditProfile --> SaveP[Save changes]
    SaveP --> ValidP{字段有效?}
    ValidP -- 否 --> ErrP[高亮缺失字段] --> EditProfile
    ValidP -- 是 --> ToastP["Toast: Changes saved ✓"]

    Payment --> SavePay[Save changes]
    SavePay --> ToastPay["Toast: Payment updated ✓"]

    Privacy --> SavePriv[Save changes]
    SavePriv --> ToastPriv["Toast: Privacy updated ✓"]

    ToastP --> HomeReturn([Player Home])
    ToastPay --> HomeReturn
    ToastPriv --> HomeReturn

    %% 切换型动作 → 就地生效
    LangToggle -. 就地切换 .-> Settings
    PushToggle -. 就地切换 .-> Settings
    BioToggle -. 就地切换 .-> Settings

    style HomeReturn fill:#A5D6A7,stroke:#333,stroke-width:2px
    style ToastP fill:#FFE57F,stroke:#333
    style ToastPay fill:#FFE57F,stroke:#333
    style ToastPriv fill:#FFE57F,stroke:#333
    style LangToggle fill:#BBDEFB,stroke:#333
    style PushToggle fill:#BBDEFB,stroke:#333
    style BioToggle fill:#BBDEFB,stroke:#333
```

**关键设计点：**
- **入口单一：** Home 右上头像 → Settings，不是先经过 Profile。Settings 是分支的根，Profile 是其下的一个视图。
- **提交型 vs 切换型：** Save changes 后必回 Home + Toast（Edit Profile / Payment / Privacy）；inline toggle 永远就地生效（Language / Push / Biometric）。这条规则决定了 1.5 Auth 和后续 build 阶段所有 Edit 表单的导航默认。
- **Toast 必须显眼：** 用户离开了刚编辑的页面，看不到字段变化——所以 Toast 是唯一确认。避免使用低对比度或淡出过快的 toast 样式。
- **View profile 只读：** 编辑入口只有两个——Settings 顶部 "Edit profile" 按钮 和 Profile 右上铅笔图标。不要在只读 Profile 上放可编辑字段。
- **取消路径：** Edit 屏幕的返回箭头 = 放弃编辑，回 Settings（不是回 Home，因为没有 "Save"）。区分"提交回 Home"和"取消回上一级"。

---

## 流程图之间的衔接

```mermaid
flowchart LR
    A[Onboarding<br/>5 步注册] --> B[First-timer Home]
    B --> C{首次决定}
    C -- Find a match --> D[玩家匹配流程<br/>Join]
    C -- Host one --> E[创建比赛流程]
    D --> F[Player Home<br/>NEXT UP]
    E --> F
    F --> D
    F --> E
    F -- 右上头像 --> G[Profile + Settings 分支]
    G -- Save changes --> F
```

---

## 如何修改这些图

把 ` ```mermaid ` 代码块复制到任意 Mermaid 编辑器（如 [mermaid.live](https://mermaid.live)）即可可视化和导出 SVG/PNG。后续要改流程，只需要改 .md 文件里的代码块即可。
