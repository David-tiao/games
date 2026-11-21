/** Original pedagogical sequences, not professional game records or forced variations. */
import {boardKey,tryMove} from './goRules.js';
export const GO_METHODS = [
  {
    "id": "decision",
    "category": "思考框架",
    "title": "每手三问",
    "titleEn": "Three questions before each move",
    "principle": "先问：有棋会被吃吗？有弱棋要救吗？这一步能获得什么？再决定是攻击、联络还是扩张。",
    "principleEn": "Ask: Is a group in danger? Does a weak group need help? What value does this move gain?",
    "question": "如果棋盘很空，为什么先占角部而不是贴在一起？",
    "questionEn": "On an empty board, why start in a corner instead of clustering stones?",
    "size": 9,
    "black": [],
    "white": [],
    "steps": [
      {
        "color": 1,
        "at": [
          2,
          2
        ],
        "note": "黑先占左上角，便于利用两条边界。",
        "noteEn": "Black takes a corner using two natural boundaries."
      },
      {
        "color": 2,
        "at": [
          6,
          6
        ],
        "note": "白占对角，不急于贴黑棋。",
        "noteEn": "White claims an opposite corner instead of playing contact moves."
      },
      {
        "color": 1,
        "at": [
          4,
          2
        ],
        "note": "黑沿边发展，为已有角部棋子留下空间。",
        "noteEn": "Black develops from the corner along the side."
      },
      {
        "color": 2,
        "at": [
          6,
          4
        ],
        "note": "白沿边延伸，双方都从角向外扩张。",
        "noteEn": "White extends along the side; both players develop from corners."
      }
    ]
  },
  {
    "id": "capture",
    "category": "攻防基础",
    "title": "数气、叫吃、提子",
    "titleEn": "Liberties, atari, and capture",
    "principle": "提子由气决定：一块相连的棋没有气时，整块立即被提走。先数气，再判断能否提。",
    "principleEn": "Captures are determined by liberties. A connected group with none is removed.",
    "question": "中央白子最后一口气在哪里？",
    "questionEn": "Where is the central White stone’s final liberty?",
    "size": 9,
    "black": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "white": [
      [
        4,
        4
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          5
        ],
        "note": "黑填掉中央白子的最后一口气，将白子提走。",
        "noteEn": "Black fills the final liberty and captures White."
      },
      {
        "color": 2,
        "at": [
          6,
          6
        ],
        "note": "白选择在外围重新发展，不会凭空复活被提的棋。",
        "noteEn": "White develops elsewhere; the captured stone does not reappear."
      },
      {
        "color": 1,
        "at": [
          5,
          5
        ],
        "note": "黑连接并扩大已获得的局部空间。",
        "noteEn": "Black develops next to the capture and improves local shape."
      }
    ]
  },
  {
    "id": "escape",
    "category": "攻防基础",
    "title": "叫吃时先救急",
    "titleEn": "Escape from atari",
    "principle": "己方棋块只剩一口气时先停下来检查：接长是否真的增加气？能否反提？逃不掉就考虑弃子。",
    "principleEn": "If your group is in atari, check whether extending really adds liberties, or whether a countercapture is possible.",
    "question": "黑棋向哪里延伸才能脱离一口气？",
    "questionEn": "Where can Black extend to get more liberties?",
    "size": 9,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          5
        ],
        "note": "黑顺最后一口气接长，暂时摆脱被叫吃。",
        "noteEn": "Black extends along its last liberty, gaining room."
      },
      {
        "color": 2,
        "at": [
          2,
          2
        ],
        "note": "白不一定紧追；局部危险暂时缓和。",
        "noteEn": "White chooses elsewhere; the local danger has eased."
      },
      {
        "color": 1,
        "at": [
          4,
          6
        ],
        "note": "黑沿更宽敞的一侧继续延长。",
        "noteEn": "Black extends toward more open space."
      }
    ]
  },
  {
    "id": "connect",
    "category": "棋形效率",
    "title": "先接断点，再谈攻击",
    "titleEn": "Connect before attacking",
    "principle": "两块棋斜靠近不代表连接。面对明确断点，应先估算切断后的损失，再决定是否连接。",
    "principleEn": "Diagonal contact is not a direct connection. Evaluate cutting points before launching an attack.",
    "question": "两颗黑棋中间的唯一连接点在哪里？",
    "questionEn": "Where is the one-point connection between Black’s stones?",
    "size": 9,
    "black": [
      [
        3,
        4
      ],
      [
        5,
        4
      ]
    ],
    "white": [
      [
        3,
        3
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          4
        ],
        "note": "黑直接补断，两块棋成为一块并共享气。",
        "noteEn": "Black connects directly, making one group with shared liberties."
      },
      {
        "color": 2,
        "at": [
          6,
          6
        ],
        "note": "白选择另一片尚未发展过的空旷区域。",
        "noteEn": "White takes a separate area."
      },
      {
        "color": 1,
        "at": [
          4,
          5
        ],
        "note": "黑顺势向下发展，不只顾贴着对手。",
        "noteEn": "Black develops outward instead of making unnecessary contact."
      }
    ]
  },
  {
    "id": "double-atari",
    "category": "手筋攻杀",
    "title": "双叫吃的选择",
    "titleEn": "Double atari",
    "principle": "两块不相连的敌棋如果共享一个关键空点，一手可能同时使它们只剩一口气。",
    "principleEn": "Two separate enemy groups can be put into atari by the same move.",
    "question": "中间落子之后，白棋哪一边会优先逃？",
    "questionEn": "After the central move, which White group will escape first?",
    "size": 9,
    "black": [
      [
        2,
        4
      ],
      [
        6,
        4
      ],
      [
        3,
        3
      ],
      [
        5,
        3
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        5,
        4
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          4
        ],
        "note": "黑一手对左右两块白棋同时叫吃。",
        "noteEn": "Black puts both separated White stones in atari."
      },
      {
        "color": 2,
        "at": [
          3,
          5
        ],
        "note": "白只救左边一子，右边仍危险。",
        "noteEn": "White saves its left stone; the right one remains endangered."
      },
      {
        "color": 1,
        "at": [
          5,
          5
        ],
        "note": "黑填掉右边白子的最后一口气，成功提子。",
        "noteEn": "Black fills the final liberty of the right White stone, capturing it."
      }
    ]
  },
  {
    "id": "ladder",
    "category": "手筋攻杀",
    "title": "征子：看远一点",
    "titleEn": "Ladder: read ahead",
    "principle": "征子沿斜线不断叫吃。第一手合理不代表必定征成功，远处的接应棋子可能成为“征子引征”。",
    "principleEn": "A ladder is a sequence of ataris. The first atari may be fine, but a distant ladder breaker can change the outcome.",
    "question": "白逃后，黑怎样继续控制逃跑方向？",
    "questionEn": "After White extends, how does Black continue to control its direction?",
    "size": 9,
    "black": [
      [
        3,
        3
      ],
      [
        4,
        4
      ]
    ],
    "white": [
      [
        4,
        3
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          5,
          3
        ],
        "note": "黑先叫吃中央白子，向边上引导逃跑路线。",
        "noteEn": "Black starts with an atari and controls an escape direction."
      },
      {
        "color": 2,
        "at": [
          4,
          2
        ],
        "note": "白接长求生，征子的阅读从这里开始。",
        "noteEn": "White extends; the ladder reading begins here."
      },
      {
        "color": 1,
        "at": [
          5,
          2
        ],
        "note": "黑继续紧气，但必须看前方是否有白棋接应。",
        "noteEn": "Black applies further pressure, but must look for possible ladder breakers."
      }
    ]
  },
  {
    "id": "net",
    "category": "手筋攻杀",
    "title": "枷吃：封住出路",
    "titleEn": "Net: block the escape",
    "principle": "枷吃的关键不一定是连续叫吃，而是把棋走在对方将要逃向的地方，形成网状限制。",
    "principleEn": "A net controls the destination of an escaping group instead of chasing every liberty.",
    "question": "完成封锁框架后，白棋是否还能轻易跑出？",
    "questionEn": "After the net-like frame is formed, how easy is it for White to escape?",
    "size": 9,
    "black": [
      [
        3,
        3
      ],
      [
        5,
        3
      ],
      [
        3,
        6
      ]
    ],
    "white": [
      [
        4,
        5
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          5,
          6
        ],
        "note": "黑先占外侧封锁点，形成网的外框。",
        "noteEn": "Black plays the outside blocking point, creating a net-like frame."
      },
      {
        "color": 2,
        "at": [
          4,
          4
        ],
        "note": "白尝试向上逃，仍要面对附近黑棋。",
        "noteEn": "White tries to escape upward, with Black nearby."
      },
      {
        "color": 1,
        "at": [
          4,
          3
        ],
        "note": "黑加固上方。这里是演示枷形，不保证必然吃净。",
        "noteEn": "Black reinforces above. This illustrates containment, not a forced capture."
      }
    ]
  },
  {
    "id": "shape",
    "category": "棋形效率",
    "title": "虎口、竹节与效率",
    "titleEn": "Tiger mouth and bamboo shape",
    "principle": "好棋形看的是气、联络与弹性，不是棋子堆得多。虎口和竹节都是常见的间接联络。",
    "principleEn": "Good shape balances liberties, connection, and flexibility rather than simply clustering stones.",
    "question": "三颗黑棋围成的空口要不要立刻填？",
    "questionEn": "Should you immediately fill an empty point inside a tiger mouth?",
    "size": 9,
    "black": [],
    "white": [],
    "steps": [
      {
        "color": 1,
        "at": [
          3,
          3
        ],
        "note": "黑先下一子，作为棋形的起点。",
        "noteEn": "Black establishes the first support stone."
      },
      {
        "color": 2,
        "at": [
          7,
          7
        ],
        "note": "白选择远处，给演示留出空间。",
        "noteEn": "White plays far away to leave room for the example."
      },
      {
        "color": 1,
        "at": [
          5,
          3
        ],
        "note": "黑与第一子保持一格距离。",
        "noteEn": "Black keeps a one-point gap."
      },
      {
        "color": 2,
        "at": [
          7,
          6
        ],
        "note": "白在角部继续发展自己的棋形。",
        "noteEn": "White develops its own corner."
      },
      {
        "color": 1,
        "at": [
          4,
          4
        ],
        "note": "黑落下第三子，形成留有中间空口的虎口。",
        "noteEn": "Black makes a tiger mouth, leaving the central mouth empty."
      }
    ]
  },
  {
    "id": "twoeyes",
    "category": "死活眼形",
    "title": "两个真眼为什么活",
    "titleEn": "Why two real eyes live",
    "principle": "相连的棋块若真正拥有两个互不相通的眼位，通常不会被直接提光；但要先识别假眼。",
    "principleEn": "A connected group with two independent true eyes is generally safe; false eyes must be checked.",
    "question": "两个内部空点为什么不应该随便填掉？",
    "questionEn": "Why should you avoid filling the two internal points?",
    "size": 9,
    "black": [
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        2,
        3
      ],
      [
        4,
        3
      ],
      [
        6,
        3
      ],
      [
        2,
        4
      ],
      [
        3,
        4
      ],
      [
        4,
        4
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ]
    ],
    "white": [
      [
        8,
        8
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          7,
          2
        ],
        "note": "黑从外侧加固，同时保留内部两个空点。",
        "noteEn": "Black reinforces outside and keeps both internal eyes open."
      },
      {
        "color": 2,
        "at": [
          8,
          7
        ],
        "note": "白在外围扩张，没有进入黑棋真眼。",
        "noteEn": "White expands outside instead of entering the true eyes."
      },
      {
        "color": 1,
        "at": [
          7,
          3
        ],
        "note": "黑继续巩固边界，仍没有自填眼。",
        "noteEn": "Black strengthens the edge, still preserving the eyes."
      }
    ]
  },
  {
    "id": "sacrifice",
    "category": "中盘取舍",
    "title": "弃子与大局",
    "titleEn": "Sacrifice and whole-board value",
    "principle": "并非每颗棋都值得救。无法有效逃脱时，走别处大点常好过花很多手被动奔跑。",
    "principleEn": "Not every stone is worth saving. An efficient move elsewhere may beat repeatedly running with a doomed stone.",
    "question": "中央黑子被包围后，为什么可以暂时不理？",
    "questionEn": "Why might you leave the surrounded central Black stone?",
    "size": 9,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          2,
          2
        ],
        "note": "黑暂时弃掉中央孤子，改占左上角。",
        "noteEn": "Black leaves the surrounded center stone and takes the upper-left corner."
      },
      {
        "color": 2,
        "at": [
          6,
          6
        ],
        "note": "白抢右下角，继续比拼大场。",
        "noteEn": "White claims the lower-right corner."
      },
      {
        "color": 1,
        "at": [
          2,
          3
        ],
        "note": "黑把先前的角部变成更稳定的据点。",
        "noteEn": "Black reinforces the corner it just took."
      }
    ]
  },
  {
    "id": "corner",
    "category": "布局方向",
    "title": "金角银边草肚皮",
    "titleEn": "Corners, sides, and center",
    "principle": "同样的子数，角部最容易借助棋盘边界围空；边次之，中腹最费棋。开局从角边展开通常较有效率。",
    "principleEn": "Corners need fewer stones to make territory, followed by sides; the center generally needs more.",
    "question": "为什么双方从相对的角开始，而不是抢正中央？",
    "questionEn": "Why do both players start in corners instead of the exact center?",
    "size": 9,
    "black": [],
    "white": [],
    "steps": [
      {
        "color": 1,
        "at": [
          2,
          2
        ],
        "note": "黑从角部落子，借用两条边界。",
        "noteEn": "Black starts near a corner, using both board edges."
      },
      {
        "color": 2,
        "at": [
          6,
          6
        ],
        "note": "白在另一角落子，也获得发展方向。",
        "noteEn": "White claims the opposite corner."
      },
      {
        "color": 1,
        "at": [
          2,
          4
        ],
        "note": "黑沿左边展开，为未来围地做准备。",
        "noteEn": "Black extends down the left side."
      },
      {
        "color": 2,
        "at": [
          6,
          4
        ],
        "note": "白沿右边发展，形成对照。",
        "noteEn": "White develops down the right side."
      }
    ]
  },
  {
    "id": "opening",
    "category": "布局方向",
    "title": "星位、小目与模样",
    "titleEn": "Star point, 3–4 point, and framework",
    "principle": "星位一般重速度与外势，小目一般更偏角地；两者都是常见选择，没有放之四海皆准的最优定式。",
    "principleEn": "Star points often favor speed and influence; 3–4 points lean toward corner territory. Context matters.",
    "question": "同一局里，星位与小目能怎样形成不同的方向？",
    "questionEn": "How do star points and 3–4 points shape different plans?",
    "size": 13,
    "black": [],
    "white": [],
    "steps": [
      {
        "color": 1,
        "at": [
          3,
          3
        ],
        "note": "黑走左上星位，意在迅速发展。",
        "noteEn": "Black takes an upper-left star point for speedy development."
      },
      {
        "color": 2,
        "at": [
          9,
          9
        ],
        "note": "白走右下星位，呼应对角。",
        "noteEn": "White takes a lower-right star point."
      },
      {
        "color": 1,
        "at": [
          6,
          3
        ],
        "note": "黑沿上边扩展，形成潜在模样。",
        "noteEn": "Black expands along the top to build a possible framework."
      },
      {
        "color": 2,
        "at": [
          9,
          3
        ],
        "note": "白在右上附近建立自己的支点。",
        "noteEn": "White establishes a supporting point near the upper right."
      }
    ]
  },
  {
    "id": "approach",
    "category": "布局方向",
    "title": "挂角、守角与夹击",
    "titleEn": "Approach, enclosure, and pincer",
    "principle": "挂角、守角和夹击不是固定套招：附近谁更强、哪一边更宽决定选择。",
    "principleEn": "Approaches, enclosures, and pincers are choices, not memorized answers; local strength and space matter.",
    "question": "白靠近黑角后，黑从外侧夹击会产生什么压力？",
    "questionEn": "What pressure does Black create by pincering the approaching White stone?",
    "size": 13,
    "black": [
      [
        3,
        3
      ]
    ],
    "white": [
      [
        9,
        9
      ],
      [
        5,
        3
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          7,
          3
        ],
        "note": "黑从外侧限制白棋沿上边向右展开，这是夹击的示意。",
        "noteEn": "Black pincers from outside, restricting White’s rightward extension."
      },
      {
        "color": 2,
        "at": [
          5,
          5
        ],
        "note": "白向中腹腾挪，避免太靠近黑棋。",
        "noteEn": "White runs toward the center to avoid being squeezed."
      },
      {
        "color": 1,
        "at": [
          3,
          6
        ],
        "note": "黑加固角部及左边发展方向。",
        "noteEn": "Black supports its corner and left-side development."
      }
    ]
  },
  {
    "id": "reduce",
    "category": "布局方向",
    "title": "模样浅消与打入",
    "titleEn": "Reduction versus invasion",
    "principle": "浅消通常从外围缩小对手潜在模样；打入深入模样，可能获得实地但危险更高。",
    "principleEn": "Reduction limits a moyo from outside; invasion enters more deeply and usually carries more risk.",
    "question": "白棋上边三子形成模样时，黑可以在哪里浅消？",
    "questionEn": "Where can Black reduce White’s upper-side framework?",
    "size": 19,
    "black": [
      [
        3,
        15
      ],
      [
        15,
        15
      ]
    ],
    "white": [
      [
        3,
        3
      ],
      [
        9,
        3
      ],
      [
        15,
        3
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          9,
          6
        ],
        "note": "黑在白棋上边模样外侧落子，不深冲角里。",
        "noteEn": "Black reduces the upper framework from outside rather than diving too deep."
      },
      {
        "color": 2,
        "at": [
          12,
          5
        ],
        "note": "白沿模样边缘应对，试图保持外势。",
        "noteEn": "White answers on the edge of its framework."
      },
      {
        "color": 1,
        "at": [
          9,
          5
        ],
        "note": "黑向上靠近，但仍应观察白棋厚度和退路。",
        "noteEn": "Black develops upward but must judge White’s strength and escape routes."
      }
    ]
  },
  {
    "id": "sente",
    "category": "中盘取舍",
    "title": "先手与后手的取舍",
    "titleEn": "Sente versus gote",
    "principle": "有救急点时，即使失去先手也应先处理；确定安全后再争大场。先手与后手是局面判断，不是死标签。",
    "principleEn": "Sometimes urgent defense is worth losing sente. Once safe, look for the next large point.",
    "question": "为什么第一手先救中腹黑棋，再去角部？",
    "questionEn": "Why does Black save its central stone before playing in a corner?",
    "size": 9,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          5
        ],
        "note": "黑先逃出叫吃，确保棋块仍有气。",
        "noteEn": "Black escapes atari, accepting an urgent defensive move."
      },
      {
        "color": 2,
        "at": [
          2,
          2
        ],
        "note": "白抢到角部大场，说明防守可能是后手。",
        "noteEn": "White takes a corner big point, showing Black’s defense may be gote."
      },
      {
        "color": 1,
        "at": [
          6,
          6
        ],
        "note": "黑再拿一个有价值的角部。",
        "noteEn": "Black takes another valuable corner point."
      }
    ]
  },
  {
    "id": "endgame",
    "category": "官子与终局",
    "title": "挡、收官与虚手",
    "titleEn": "Endgame block and passing",
    "principle": "收官时要比较每手真正增加或减少的点数；双方认为没有必要落子时连续虚手进入数目。",
    "principleEn": "In the endgame, compare actual point changes. Two consecutive passes start scoring.",
    "question": "第一手挡后，为何要等到双方都认为没有更大点才虚手？",
    "questionEn": "Why wait until both players see no meaningful endgame points before passing?",
    "size": 9,
    "black": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        1
      ],
      [
        1,
        1
      ],
      [
        3,
        0
      ]
    ],
    "white": [
      [
        5,
        0
      ],
      [
        5,
        1
      ]
    ],
    "steps": [
      {
        "color": 1,
        "at": [
          4,
          0
        ],
        "note": "黑在边线挡住白棋向左扩张；还需比较官子价值。",
        "noteEn": "Black blocks White along the top edge; compare its endgame value."
      },
      {
        "color": 2,
        "at": [
          7,
          7
        ],
        "note": "白在其他地方有应手；示范棋局并非完整终局。",
        "noteEn": "White plays elsewhere; the position is not a fully finished game."
      },
      {
        "color": 1,
        "at": null,
        "note": "黑示范虚手：这里只演示操作，不表示实际已经没有官子。",
        "noteEn": "Black passes to demonstrate the action, not because all endgame points are resolved."
      },
      {
        "color": 2,
        "at": null,
        "note": "白也虚手，依规则可进入数目阶段。",
        "noteEn": "White passes too; by the rules, scoring may begin."
      }
    ]
  }
];

export function methodBoardAt(method, ply){
  const size=method.size;
  if (!Number.isInteger(ply)||ply<0||ply>method.steps.length)throw Error('Invalid replay ply');
  const board=Array(size*size).fill(0);
  for (const [x,y] of method.black){if(board[y*size+x])throw Error('Overlapping setup stones');board[y*size+x]=1}
  for (const [x,y] of method.white){if(board[y*size+x])throw Error('Overlapping setup stones');board[y*size+x]=2}
  const history=[boardKey(board)];
  let current=board,lastMove=null,captures=0;
  for(let i=0;i<ply;i++){
    const step=method.steps[i];
    if(step.at===null){lastMove=null;continue}
    const index=step.at[1]*size+step.at[0];
    const result=tryMove(current,index,step.color,size,history);
    current=result.board;
    history.push(result.key);
    lastMove=index;
    captures+=result.captured;
  }
  return {board:current,lastMove,captures};
}

const sgfPoint=([x,y])=>String.fromCharCode(97+x)+String.fromCharCode(97+y);
/** Share/copy as standard SGF. No third-party SGF parser is required. */
export function methodToSgf(method){
  const props=[`GM[1]FF[4]SZ[${method.size}]KM[7.5]`];
  if(method.black.length)props.push('AB'+method.black.map(p=>`[${sgfPoint(p)}]`).join(''));
  if(method.white.length)props.push('AW'+method.white.map(p=>`[${sgfPoint(p)}]`).join(''));
  const moves=method.steps.map(step=>`;${step.color===1?'B':'W'}[${step.at===null?'':sgfPoint(step.at)}]`).join('');
  return `(;${props.join('')}${moves})`;
}
