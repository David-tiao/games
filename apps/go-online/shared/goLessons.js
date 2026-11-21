import {ADVANCED_LESSONS} from './goLessonsAdvanced.js';
/** Fifty focused, local-only, explainable beginner Go lessons.
 * Training boards are pedagogical positions, not reconstructed game records.
 * Targets show good introductory choices rather than guaranteed optimal moves.
 */
export const GO_LESSONS = [
  {
    id:1, chapter:'第一卷 · 落子识气', title:'认识气与延气', badge:'基础',
    concept:'气是棋子上下左右紧邻的空交叉点。相连的同色棋子共享气。',
    why:'棋子的气少，就更容易被提走；延伸己方棋块通常能增加气。',
    task:'请从中央的黑棋向外延伸一手，增加它的气。',
    hint:'看中央黑子的右侧或下侧，选择一处空交叉点。',
    expand:'先数一颗棋子的气，再数连成一块的两颗棋子的气；比较哪一方更安全。',
    mistake:'斜对角的空点不算气；两颗斜对角的同色棋子也没有直接连成一块。',
    black:[[4,4]], white:[[3,4],[4,3]], targets:[[5,4],[4,5]],
    success:'这一步把黑棋向外延伸，避免继续挤在只剩少量气的危险位置。'
  },
  {
    id:2, chapter:'第一卷 · 落子识气', title:'学会叫吃', badge:'基础',
    concept:'让对手一块棋只剩最后一口气，就叫“叫吃”。',
    why:'叫吃是一种威胁，不等于已经提子；对手通常还有机会逃跑。',
    task:'观察中央白棋的两口气，找一步让它只剩一口气。',
    hint:'白棋在中央，左右上下的空位中，右边或下边都值得考虑。',
    expand:'下完后点击白棋数气，观察 AI 如何应对：逃跑、反击还是另做选择。',
    mistake:'只是叫吃还没有提子；对手在下一回合可能加长棋块逃脱。',
    black:[[3,4],[4,3]],white:[[4,4]],targets:[[5,4],[4,5]],
    success:'你成功制造了叫吃，下一步关键是先检查白棋能否补气逃脱。'
  },
  {
    id:3, chapter:'第一卷 · 落子识气', title:'堵住最后一口气', badge:'基础',
    concept:'一块棋的气变为零时，整块棋会被提走。',
    why:'比起漫无目的地抢地，先处理眼前明确的提子机会更容易看懂局面。',
    task:'白棋只剩最后一口气，请直接提掉中央白子。',
    hint:'中央白棋的正下方（棋盘横向中央、纵向下一格）是它最后的气。',
    expand:'提子后，被提走的交叉点重新变成空点，也可能成为旁边棋块的新气。',
    mistake:'不要只看白棋周围有几颗黑子，要找唯一剩下的空交叉点。',
    black:[[3,4],[4,3],[5,4]],white:[[4,4]],targets:[[4,5]],
    success:'你堵住了最后一口气，白棋被提走。记住：提的是整块无气的棋。'
  },
  {
    id:4, chapter:'第一卷 · 落子识气', title:'被叫吃时先逃', badge:'救急',
    concept:'被叫吃时，首先判断能否延长棋块来补气。',
    why:'如果只顾攻击别人，而没有看自己的最后一口气，下一手就可能损失整块棋。',
    task:'中央黑棋正在被叫吃，请沿它最后一口气方向逃出。',
    hint:'中央黑棋只有正下方一口气，从那里延伸可让这块棋获得更多气。',
    expand:'逃跑也可能无效：如果延伸后仍然只有一口气，就要寻找反提或弃子的办法。',
    mistake:'两块棋即使颜色相同，若仅在斜对角相邻，也没有真正连起来。',
    black:[[4,4]],white:[[3,4],[4,3],[5,4]],targets:[[4,5]],
    success:'你及时接长棋块补气。这是初学者最重要的“先救急”意识。'
  },
  {
    id:5, chapter:'第二卷 · 连接攻防', title:'直接连接', badge:'棋形',
    concept:'两个分开的己方棋块，可以通过落在共同连接点连成一块。',
    why:'直接连起来后，两侧棋子共享气，更不容易被对手逐个攻击。',
    task:'请把中间隔着一个空点的两颗黑子连起来。',
    hint:'两颗黑子分别在同一行的左右两边，中间的空点就是直接连接处。',
    expand:'连接后点击其中一颗黑子，观察整块棋的数量和气。',
    mistake:'要注意对方是否能在你连接前先占据断点。',
    black:[[3,4],[5,4]],white:[[2,3],[6,5]],targets:[[4,4]],
    success:'两颗黑棋已连接成整体，可以共同分享气并互相保护。'
  },
  {
    id:6, chapter:'第二卷 · 连接攻防', title:'抢占切断点', badge:'攻防',
    concept:'切断是占住对手两个棋块之间的重要连接点，使它们难以相互照应。',
    why:'对手无法顺利连接时，需要分别照顾两块棋，防守压力增加。',
    task:'白棋两块形状松散，请抢先占据中间的关键切断点。',
    hint:'中间两颗白棋之间有一个上下左右都值得争夺的空点，优先看中央。',
    expand:'切断后不要贸然追击，检查自己的切断之子是否有足够的气。',
    mistake:'切断成功并不等于能吃掉白棋；弱小的切断之子也可能被反攻。',
    black:[[4,3],[4,5]],white:[[3,4],[5,4]],targets:[[4,4]],
    success:'你先占到了双方争夺的要点，让黑棋联络更紧密，也阻止白棋直接相连。'
  },
  {
    id:7, chapter:'第二卷 · 连接攻防', title:'斜棋补断', badge:'棋形',
    concept:'斜对角的两颗棋子看似靠近，其实没有直接连通。',
    why:'被对手靠近时，填上关键断点可减少棋块被分割的风险。',
    task:'两颗黑棋斜着站立，请把它们连接成真正的一块棋。',
    hint:'寻找两颗黑棋共享的相邻空点；靠近白棋的一侧值得优先防守。',
    expand:'补断后比较棋形：直接连接很稳固，但过度密集时可能效率不足。',
    mistake:'斜对角不会共享气，不要误以为斜着的棋子已经直接连在一起。',
    black:[[3,3],[4,4]],white:[[5,3],[2,4]],targets:[[3,4],[4,3]],
    success:'这一手把斜着的两颗棋变成直接相连的棋块，防止被各个击破。'
  },
  {
    id:8, chapter:'第二卷 · 连接攻防', title:'一手双提', badge:'战术',
    concept:'有时一个落点能同时堵住两块不同敌棋的最后一口气。',
    why:'这种一手同时提掉两块棋的战术，能在紧凑形状里提高效率。',
    task:'两边白棋都只剩同一个空交叉点作为气，请一手双提。',
    hint:'观察中央空点：它同时靠着左边和右边的白棋。',
    expand:'提掉多块棋后再数黑棋的气，看看是否因提子而变得更安全。',
    mistake:'不要只盯着一颗白子；先检查相邻的其他白棋是不是也只剩同一口气。',
    black:[[2,4],[3,3],[3,5],[6,4],[5,3],[5,5]],white:[[3,4],[5,4]],targets:[[4,4]],
    success:'漂亮！一个落点同时提掉左右两颗白棋，这就是“一手双提”。'
  },
  {
    id:9, chapter:'第三卷 · 生存技巧', title:'反提救急', badge:'战术',
    concept:'自己的棋被叫吃时，不一定只能向外逃；有时能反过来提掉对方棋子。',
    why:'提掉进攻你的对方棋子，可能使原本危险的己方棋块重新获得气。',
    task:'中央黑棋告急，请找出可以提掉白子并同时救棋的一步。',
    hint:'左边白棋也只剩一口气。观察它正下方的空点。',
    expand:'这类“以攻为守”的方法先要精确数气，不能靠猜测。',
    mistake:'如果没有看出对方也被叫吃，单纯逃跑可能浪费了反击机会。',
    black:[[4,4],[2,4],[3,3]],white:[[3,4],[4,3],[5,4]],targets:[[3,5]],
    success:'你反提掉威胁黑棋的白子，帮助中央黑棋重新获得气。'
  },
  {
    id:10, chapter:'第三卷 · 生存技巧', title:'认识眼与保留眼位', badge:'死活',
    concept:'己方棋块围住的内部空交叉点，可能形成眼。通常不要无故把真正的眼填掉。',
    why:'围棋中一块棋若有两个独立的真眼，通常不能被直接提掉。',
    task:'中央黑棋围出了一处内空，请不要填掉它；试着在角部自然发展。',
    hint:'中央那个完全被黑棋围住的空点应保留。看看棋盘四角附近的星位。',
    expand:'这一课只认识眼位雏形；真眼、假眼、双眼活棋需要更多实战练习。',
    mistake:'填自己的眼往往浪费一手，甚至伤害棋形，但有战术需要时也有例外。',
    black:[[3,3],[4,3],[5,3],[3,4],[5,4],[3,5],[4,5],[5,5]],white:[],
    targets:[[2,2],[6,2],[2,6],[6,6]],
    success:'你保留了中央的内空，没有无故自填眼位，并在角部发展。'
  },
  {
    id:11, chapter:'第四卷 · 角边布局', title:'金角银边草肚皮', badge:'布局',
    concept:'角部利用两条天然边界，通常较容易围地；边部次之，中腹更费棋。',
    why:'新手开局先照顾角部，可以较直观地建立自己的地盘与根据地。',
    task:'空棋盘上，先选择一个适中的角部落点。',
    hint:'9 路棋盘的四个星位附近，例如离相邻两条边都还有两格的位置。',
    expand:'观察 AI 的回应，再比较双方谁先占角、谁从边上发展。',
    mistake:'不要把“先占角”理解成固定规则，紧急提子和死活往往更重要。',
    black:[],white:[],targets:[[2,2],[6,2],[2,6],[6,6]],
    success:'你从角部开始布局，方向清楚，也更容易理解接下来的守角与拆边。'
  },
  {
    id:12, chapter:'第四卷 · 角边布局', title:'守角与扩张', badge:'布局',
    concept:'占角后可以用另一手从同一角附近展开，使局部更有发展潜力。',
    why:'过早在中腹打散，容易失去靠边建立地盘的效率。',
    task:'黑棋已经占据左上角，请在角部附近再走一步继续发展。',
    hint:'从左上黑棋沿上边或左边向外延伸约两格。',
    expand:'比较守角和抢别处空角的价值；布局需要根据全局判断，没有万能定式。',
    mistake:'不要把守角当作绝对必需；对手威胁更大时要先应急。',
    black:[[2,2]],white:[[6,6]],targets:[[4,2],[2,4]],
    success:'你围绕已经占住的角部继续发展，形成比较清楚的地盘方向。'
  },
  {
    id:13, chapter:'第四卷 · 角边布局', title:'拆边与留空间', badge:'布局',
    concept:'在已有己棋附近沿边展开，适度拉开距离，争取较宽的布局空间。',
    why:'围棋布局讲究效率：全贴在一起太拥挤，离得过远又容易被打入。',
    task:'左上已有黑棋，请沿同一边向远处适度拆开一手。',
    hint:'可尝试比上一课再远一点的边上落点，约隔两个空交叉点。',
    expand:'看看 AI 会选择逼近、占角还是发展自身。以后还可以学习“拆二”“拆三”。',
    mistake:'拆边不是机械地拉开距离，周围敌棋越强，越要注意安全。',
    black:[[2,2]],white:[[7,6]],targets:[[5,2],[2,5]],
    success:'这一手沿边留出发展空间，比每步都贴着已有黑子更有布局效率。'
  },
  {
    id:14, chapter:'第四卷 · 角边布局', title:'受压时向中央出头', badge:'方向',
    concept:'棋块被对手从边线方向压住时，常需要向棋盘中央寻找空间和出路。',
    why:'一直沿边被动爬行通常效率较低，出头有利于保持棋块的活动能力。',
    task:'黑棋在下边遇到压力，请试着向棋盘中央接长出头。',
    hint:'观察右边那颗黑棋正上方的位置。',
    expand:'出头不代表盲目冲断；还要数气，判断中央是否有对方强棋。',
    mistake:'如果只沿最下面一线爬行，可能耗费很多手却围不到多少地。',
    black:[[4,6],[5,6]],white:[[3,6],[4,5]],targets:[[5,5]],
    success:'你选择向中央发展，为黑棋保持了更大的活动空间。'
  },
  {
    id:15, chapter:'第五卷 · 终局思考', title:'虚手与教学数目', badge:'终局',
    concept:'当双方都认为无需再落子时，可以连续虚手，进入数目阶段。',
    why:'真正的终局需要理解死子与地盘；在本课程中通过教学示范体验中式数子。',
    task:'本课是模拟的终局练习，请点击“虚手 PASS”，观察 AI 也虚手，然后确认教学数目。',
    hint:'不需要在棋盘上落子，点棋盘下方“虚手 PASS”即可。',
    expand:'双方连续虚手后，本程序按棋子与围住的空点进行面积计算，并给白棋贴 7.5 目。',
    mistake:'实际对局若还有未明确的死活与官子，不要过早虚手；本课只是教学示范。',
    black:[[0,0],[1,0],[0,1],[1,1],[2,0],[0,2]],white:[[7,7],[8,8],[7,8],[8,7],[6,8],[8,6]],targets:[],
    goal:'pass', success:'你完成了虚手—双方停着—确认数目的基本流程。'
  }
];

GO_LESSONS.push(...ADVANCED_LESSONS);

export function buildLessonBoard(lesson) {
  const size=lesson.size||9;
  const board=Array(size*size).fill(0);
  for (const [x,y] of lesson.black) board[y*size+x]=1;
  for (const [x,y] of lesson.white) {
    if (board[y*size+x]!==0) throw Error(`Lesson ${lesson.id}: overlapping stones`);
    board[y*size+x]=2;
  }
  return board;
}
export function lessonTargetIndices(lesson){const size=lesson.size||9;return lesson.targets.map(([x,y])=>y*size+x)}
export function lessonGoalHit(lesson,index){
  return lesson.goal==='pass'?index===null:lessonTargetIndices(lesson).includes(index);
}

/** A guided placement lesson counts only after the learner solved the FIRST move
 * and the teaching AI has answered. Pass/scoring has a separate confirmation step.
 */
export function lessonMoveCompleted(lesson,firstCorrect,game){
  return lesson.goal!=='pass' && firstCorrect===true &&
    game.moveNumber>=2 && game.turn===1 && game.status==='playing';
}
