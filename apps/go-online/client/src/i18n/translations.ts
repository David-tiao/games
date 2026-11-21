import {GO_LESSONS} from '../../../shared/goLessons.js';
import {englishLessons} from './lessons';
import type {Language} from './index';

const UI:Record<string,string>={
  '碁':'GO','棋':'GO','师':'TUTOR','课':'lesson','路':'lines','手':'moves','子、':' stones,','气。':'liberties.',
  '围棋学堂':'Go Academy','围棋学堂 Online':'Go Academy Online','围棋教学对局':'Go Learning Match',
  '正在检查围棋服务器…':'Checking the Go server…',
  '和好友真人联网，或选择规则型 AI 自己练习。每手都有旁边的围棋老师解释.':'Play live with a friend or practice with a rule-based AI. Your tutor explains each move.',
  '和好友真人联网，或选择规则型 AI 自己练习。每手都有旁边的围棋老师解释。':'Play live with a friend or practice with a rule-based AI. Your tutor explains each move.',
  '注册':'Sign up','登录':'Sign in','用户名':'Username','密码':'Password','或者无需账号':'Or continue without an account',
  '3～18 位英文、数字或下划线':'3–18 letters, digits, or underscores','至少 8 位':'At least 8 characters',
  '正在处理…':'Working…','注册并进入':'Create account','直接开始人机围棋教学':'Start AI Go lesson',
  '进入十五课围棋训练营（无需登录）':'Enter 15 guided lessons (no sign-in)',
  '初学者推荐 9 路棋盘 · 教学提示可自行开关':'Beginners: start on a 9×9 board; hints can be toggled.',
  '服务器在线':'Server online','离线':'Offline','游客':'Guest','退出登录':'Sign out',
  '一边下棋，':'Play Go, ','一边学围棋。':'learn with every move.',
  '左边下棋，右边老师看局势给出可解释的推荐。推荐不保证最优，但会教你判断“气”、提子、连接和围地。':'Play on the board and learn from the tutor beside it. Suggestions are explained rather than guaranteed to be optimal; learn liberties, captures, connections, and territory.',
  '入门顺序':'Learning path','① 认识气与提子':'① Liberties and captures','② 学会角边布局':'② Corners and sides',
  '③ 练习叫吃与逃跑':'③ Atari and escape','④ 双方虚手后数目':'④ Passing and scoring',
  '棋盘大小':'Board size','新手从 9 路开始':'Start with 9×9','围棋十五课 · 从数气到收官':'15 Go Lessons · Liberties to Endgame',
  '十五个不同棋形、十五项实战目标。每一课都是你执黑棋对战教学电脑，老师实时讲解，完成进度自动保存。':'15 different board positions and practical goals. You play Black against a teaching AI, get real-time coaching, and your progress is saved automatically.',
  '开始十五课 →':'Start the 15 lessons →','跟电脑 AI 学习':'Practice with AI',
  '不需要联网、不需要其他玩家。你执黑棋；老师边推荐边讲原因。':'No connection or second player needed. You play Black; the tutor explains suggested moves.',
  '电脑难度':'AI difficulty','入门 AI · 更适合练习':'Beginner AI · easier practice','标准 AI · 稍强一些':'Standard AI · a little stronger',
  '开始人机教学对局':'Start AI practice','明确说明：这是规则型电脑程序，不是真人，也不是职业级围棋引擎。':'Your opponent is a rule-based computer program, not a human or a professional Go engine.',
  '真人联网对弈':'Play a human online',
  '两位真人使用不同账号，连接同一服务器。等待 35 秒无人加入，会明确提示并开始一盘新的人机练习。':'Two people sign in with separate accounts. If nobody joins within 35 seconds, the game clearly informs you before starting a new AI practice.',
  '创建真人私人房间':'Create private human room','输入 6 位房间号':'Enter 6-character room code','加入好友':'Join friend',
  '正在等待联网登录连接。':'Waiting for the online session.','需要先注册或登录才能与真人对弈。':'Sign up or sign in to play against a person.',
  '电脑 AI 对手 · 不是人类玩家':'Computer AI opponent · not human','双人真人联网 · LIVE':'Two humans · LIVE',
  '房间号':'Room code','分享邀请':'Share invitation','去十五课学堂':'15 lessons','老师在':'Tutor on ',
  '左侧':'left','右侧':'right','退出棋盘':'Leave match','正在等待第二位真人玩家':'Waiting for a second human player',
  '把房间号分享给朋友。':'Share the room code with your friend.','你已选择一直等待真人。':'You chose to wait for a human.',
  '一直等待真人':'Keep waiting for a human','恢复自动人机候补':'Enable AI fallback','现在转为人机':'Switch to AI now',
  '真人服务器暂时断开':'Human-game server disconnected',
  '真人棋局已暂停，系统不会冒充对手。可等待重连，或另开一盘明确标记的人机练习。':'Your human game is paused, and AI will not impersonate your opponent. Wait for reconnection or start a clearly labeled AI game.',
  '另开人机练习':'Start separate AI practice',
  '真人服务器在线。如想和朋友下棋，可以退出本盘并登录、创建真人房间。':'The human server is online. To play a friend, leave this match, sign in, and create a human room.',
  '师 · 看老师讲解':'Tutor · Open guidance','手 ·':'moves ·',
  '数目阶段：点击整块死子来标记或取消；可以恢复对局。':'Scoring: tap a group to mark or unmark dead stones. You can resume play.',
  '单击空交叉点可预览下法，双击同一点可直接快速落子；点已有的棋子可查看它的“气”。淡绿色圆环是推荐位置，蓝色圆点表示棋块的气。':'Single-click an intersection to preview; double-click to place immediately. Tap a stone to inspect liberties. The green ring shows a suggestion; blue dots show liberties.',
  '轮到你：先观察老师推荐，再决定是否采纳。':'Your turn. Read the tutor’s suggestion, then decide for yourself.',
  '电脑 AI 走棋中…':'Computer AI is playing…','等待对方落子…':'Waiting for your opponent…',
  '黑棋 · BLACK':'Black','白棋 · WHITE':'White','等待真人':'Waiting for a person',
  '电脑程序 · 非真人':'Computer program · not human','在线':'Online','暂时离线':'Temporarily offline','尚未加入':'Not joined',
  '提子':'Captures','确认落子':'Confirm move','虚手 PASS':'Pass','认输':'Resign',
  '提前结束本地练习，学习数目（教学功能）':'End practice early and learn scoring',
  '暂计：黑':'Provisional: Black','目 · 白':' pts · White','目（贴目':' pts (komi ',
  '我已核对死子，确认数目':'I checked dead stones; confirm score',
  '已确认，等待另一位真人':'Confirmed — waiting for other player',
  '确认数目（双方都确认后结束）':'Confirm score (both players must agree)',
  '继续下棋':'Resume game','教学局由你手动标记死子并确认结果；电脑不会替你判断争议死活。':'In this lesson, you mark dead stones and confirm the result. The AI cannot resolve disputed life and death.',
  '黑棋':'Black','白棋':'White','目 · 白棋':' pts · White','目（含贴目':' pts (including komi ',
  '重新开始人机练习':'New AI practice','请求再来一局':'Request rematch',
  '关闭老师讲解面板':'Close tutor panel','围棋老师教学面板':'Go tutor panel',
  '围棋老师 · 随局讲解':'Go Tutor · Move by move','收起 ✕':'Close ✕','围棋老师 · 局势讲解':'Go Tutor · Board analysis',
  '启用教学建议':'Enable tutoring','棋盘标记推荐落点':'Highlight suggested moves',
  '先记住：棋子下在交叉点，不是方格中央。':'Remember: place stones on intersections, not inside squares.',
  '现在学习终局数目：黑棋和白棋需要共同确认哪些棋块已经死亡。':'Now learn scoring: both players must agree which groups are dead.',
  '复盘时优先回想：哪一手挽救了危险棋块？哪一手忽视了气？':'When reviewing, ask: which move saved a weak group, and which missed a liberty threat?',
  '老师正在分析当前棋形…':'Tutor is analyzing the position…',
  '现在轮到 AI。观察它的落点，并想一想它在保护什么。':'It is AI’s turn. Observe its move and ask what it is protecting.',
  '现在轮到对方。你可以先观察对手的棋形。':'Your opponent is thinking. Study their groups and liberties.',
  '你点选的棋块':'Selected group','取消查看':'Clear inspection','这块':'This ','共有':' has ',
  '颗，拥有':' stones and ','口气。':' liberties.',
  '只剩一口气，已经被叫吃！优先考虑补气或反提。':'Only one liberty: this group is in atari. Extend or look for a countercapture.',
  '只有两口气，要小心对方连续紧气。':'Only two liberties. Beware of consecutive forcing moves.',
  '蓝色圆点是这些气的具体位置。你可以数一数它们。':'The blue dots show the liberties. Try counting them yourself.',
  '电脑上一手为什么这样下？':'Why did the AI play there?','AI 走在':'AI played ',
  '这是算法从电脑视角给出的解释，仅供学习。':'This is a rule-based explanation from the AI’s perspective.',
  '根据当前局面推荐':'Suggested moves for this position','仅供学习，不保证最优':'For learning; not necessarily optimal',
  '在棋盘上预览这手':'Preview this move','本回合知识点':'This turn’s concept',
  '真人对局中使用教学提示可能影响公平性，建议与好友先商量。':'Tutor hints may affect fair play in human games. Agree on their use with your friend.',
  '提示由规则和局部棋形启发式算法生成；不会进行深度死活计算或职业棋谱分析。':'Hints use rules and local-pattern heuristics, not professional-level search or life-and-death analysis.',
  '已关闭推荐，适合独立思考。可以随时重新打开。':'Hints are off. Think independently; you can enable them again at any time.',
  '围棋入门小课堂':'Go basics',
  '第一课 · 什么是“气”？':'Lesson 1 · What are liberties?',
  '棋子上下左右紧挨的空交叉点叫“气”。对角线不算气。一整块相连的同色棋子共用气；气变成零就会被提走。试着点击棋盘上的任意一颗棋子，看蓝色气点。':'Liberties are empty intersections directly adjacent to a stone, not diagonals. Connected stones share liberties; groups with none are captured. Click any stone to see its liberties as blue dots.',
  '第二课 · 叫吃与提子':'Lesson 2 · Atari and capture',
  '对方棋块只剩一口气时叫“叫吃”。堵住最后一口气就能提子；但要先确认自己落子后还有气。':'A group with one liberty is in atari. Fill its last liberty to capture it, but ensure your move is legal.',
  '第三课 · 角、边和中央':'Lesson 3 · Corners, sides, center',
  '初学常用“金角银边草肚皮”记忆方向：角利用两边更容易围地，接下来是边，中央较难直接围住。':'A beginner’s rule of thumb: corners are usually easiest for territory, followed by sides; the center is harder to surround.',
  '第四课 · 劫与禁自杀':'Lesson 4 · Ko and suicide',
  '不能下让自己棋块没有气的棋（除非同时提走对方获得气）。也不能立即或间接重复已经出现过的完整棋盘局面。':'You cannot play a move that leaves your group without liberties unless it captures the opponent. Repeating an earlier board position is also prohibited.',
  '第五课 · 什么时候结束？':'Lesson 5 · When does a game end?',
  '双方连续虚手后进入数目。需要标记死子；真人双方同意结算，AI 教学局由你确认。当前采用中式数子、白贴 7.5 目。':'After two passes, enter scoring and mark dead groups. In human games both players confirm; in AI practice you confirm. Chinese area scoring uses 7.5 komi for White.',
  '人机对局通知':'AI opponent notice','OPPONENT IDENTITY · 请先确认':'OPPONENT IDENTITY · PLEASE CONFIRM',
  '你现在打的是电脑 AI':'Your opponent is a computer AI',
  '你执黑棋，电脑执白棋。老师会在旁边给你推荐招式并解释原因。':'You play Black and the computer plays White. The tutor will suggest and explain moves.',
  '我知道了，开始跟 AI 学围棋':'Understood — start AI practice',
  '围棋学堂 · 真人房间与离线 AI 严格区分 · 规则型教学建议仅供入门参考':'Go Academy · Human games and offline AI are clearly distinguished · Rule-based hints are for beginners',
  // Academy page
  '十五课 · 古风围棋启蒙':'15 lessons · Classical Go Academy','围棋学堂 · 循序十五课':'Go Academy · 15 Guided Lessons',
  '返回原游戏':'Back to main game','每日一法，落子有理。':'One skill at a time. Every move has a reason.',
  '每节一个方法、一个专属棋形、一个教学任务。你执黑棋，':'Each lesson has one skill, one position, and one task. You play Black; ',
  '对手始终是电脑 AI，不是真人。':'the opponent is always a computer AI, never a human.',
  '/ 15 课':'/ 15 lessons','已完成':'Completed','师 · 看本课讲解':'Tutor · Open lesson guidance',
  '十五课课程目录':'15-lesson syllabus','每课可独立重练':'Replay any lesson',
  '第':'Lesson ','课 · 老师讲解':' · Tutor guidance','● 电脑教学 AI':'● Teaching computer AI',
  '本课练习':'This lesson’s task','双方虚手 · 教学数目':'Both passed · scoring lesson',
  '教学数目完成':'Scoring lesson complete','轮到你 · 黑棋':'Your turn · Black','教学 AI 正在思考 · 白棋':'Teaching AI is thinking · White',
  '单击空交叉点预览，双击同一点快速落子；点击已有的棋子，可以查看它的气。鼠标之外也可用下方按钮确认。':'Click to preview; double-click to play. Click a stone to see its liberties. You can also use the confirmation button.',
  '重练本课':'Retry lesson','双方已虚手 · 现在学习数目':'Both passed · time to learn scoring',
  '黑棋暂计':'Black provisional ','目，白棋暂计':' pts, White provisional ',
  '目（白棋含贴目 7.5）。本练习没有自动争议死子判定。':' pts (White includes 7.5 komi). This lesson does not automatically settle dead-stone disputes.',
  '确认教学数目':'Confirm lesson score','教学棋局结束':'Practice game finished','本局已经结束。':'This game is finished.',
  '✓ 本课已完成':'✓ Lesson completed','进入下一课 →':'Next lesson →',
  '关闭本课老师面板':'Close lesson tutor panel','本节要懂的道理':'What this lesson teaches','老师正在说':'Tutor says',
  '点棋看气':'Inspect liberties','有':' has ',
  '蓝色圆点是它们的气；只剩一口气就被叫吃。':'Blue dots are its liberties. One remaining liberty means atari.',
  '推荐招式与原因':'Move suggestions and reasons','本课优先寻找':'First, look for the key move in ',
  '的关键一手，完成后电脑将应棋。':'. The computer will respond once you play it.',
  '收起思路提示':'Hide hint','展开思路提示':'Show hint','隐藏具体推荐位置':'Hide suggested intersections',
  '显示具体推荐位置':'Show suggested intersections','请使用棋盘下方的“虚手 PASS”。':'Use the PASS button below the board.',
  '推荐先试':'Try ','棋盘上的绿色圈标出其中一个候选点。':'A green circle marks a suggested intersection.',
  '预览这手':'Preview this move','现在观察电脑 AI 的回应；它会遵守同一套围棋落子与提子规则。':'Watch the teaching AI respond. It follows the same placement and capture rules.',
  '电脑刚才为什么这么下？':'Why did the AI play this?','白棋走在':'White played ',
  '从这一小方法拓展开来':'Build on this idea','本课易错点':'Common mistake',
  '教学建议使用规则与局部棋形启发式算法，不保证每手为全局最优。完成进度仅保存在当前浏览器；真人联机功能保持独立。':'Tutor suggestions use rule-based heuristics, not a professional engine. Progress is saved only in this browser; human multiplayer remains separate.',
  '十五课围棋训练营 · 独立教学模块 · 不影响真人联机与自由人机对局':'15 Go Lessons · Independent learning module · Human matches and free AI practice remain unchanged',
  // Various status and feedback strings
  '尚未连接服务器。':'Not connected to the server.','服务器响应超时，请检查连接。':'Server timed out. Check your connection.',
  '没有连接到围棋服务器，已自动创建一盘离线人机练习。你的对手是本地电脑 AI，不是真人。':'No connection to the Go server. A new offline practice game has started with a local computer AI, not a human.',
  '登录会话已失效，请重新登录。':'Your login session expired. Please sign in again.',
  '真人服务器连接中断；目前的真人棋局已暂停，不会偷偷换成 AI。':'Disconnected from the multiplayer server. Your human match is paused; it will not secretly switch to AI.',
  '房间已关闭。':'The room is closed.','好友可能已进入，已取消自动人机切换。':'A friend may have joined. Automatic AI fallback was cancelled.',
  '等待 35 秒仍无人加入真人房间，因此已自动创建一盘新的人机练习。现在与你下棋的是电脑 AI，不是真人。':'No human joined within 35 seconds. A new practice game has started with a computer AI, not a human.',
  '与真人服务器断开了连接，已另开一盘本地 AI 练习。原真人房间不会同步进这盘棋。':'Connection to the human server was lost. A separate local AI practice was opened; the old human game will not be synchronized.',
  '登录失败。':'Sign-in failed.','操作失败。':'Action failed.','网络已断开。请等待重连，或明确选择“另开人机练习”。':'Connection lost. Wait for reconnection, or explicitly start a separate AI practice.',
  '离开当前真人房间并另外开始一盘人机练习？已经进行的真人对局不会继续同步。':'Leave the current human room and start a separate AI practice? The existing match will not continue to sync.',
  '你已选择人机教学模式。对手是本地规则型电脑 AI，不是真人玩家。':'You chose AI teaching mode. The opponent is a local rule-based computer AI, not a person.',
  '已通过双击快速落子。':'Move placed by double-click.','快速落子失败。':'Quick placement failed.','落子无效。':'Invalid move.',
  '提前结束本地练习并进入数目教学？这是学习功能，不代表双方已经同意正常终局。':'End local practice early and enter scoring practice? This is for learning, not a normal agreed game ending.',
  '已进入教学数目：请标记你认为已死亡的棋块，再确认结算。':'Scoring lesson started. Mark groups you believe are dead, then confirm the score.',
  '确定认输并结束这盘棋吗？':'Resign and end this game?','真人房间邀请已复制，发给朋友即可。':'Invitation copied. Send it to your friend.',
  '复制邀请链接：':'Copy invitation link:','正在等待真人好友加入':'Waiting for a human friend',
  '双方虚手后进入数目阶段':'Both players passed; scoring begins',
  '获胜':'wins','平局':'Draw','轮到你（黑棋）落子':'Your turn (Black)',
  '电脑 AI 正在思考（白棋）':'Computer AI is thinking (White)','轮到你落子':'Your turn',
  '老师：先读本课目标，再观察棋盘。每次只练一个关键方法。':'Tutor: read the goal and inspect the board. Focus on one skill at a time.',
  '老师：先读本课目标，再观察棋盘。你执黑棋，白棋是本地教学 AI。':'Tutor: read the goal first. You play Black; White is a local teaching AI.',
  '老师：先看看 AI 的上一手有没有制造新威胁，再数气、选方向。':'Tutor: check whether the AI’s last move created a threat. Count liberties, then choose a direction.',
  '老师：我们会体验数目，但你第一手没有完成虚手任务；需要重练本课才会标记完成。':'Tutor: we can practice scoring, but your first move missed the PASS task. Retry the lesson to complete it.',
  '老师：你已选择虚手。电脑 AI 也会虚手，让我们一起体验数目阶段。':'Tutor: you passed. The AI will pass too, and we will practice scoring.',
  '老师：你选择虚手了。但本课的目标是实战下一手；可以重练来完成目标。':'Tutor: you passed, but this lesson asks for a board move. Retry to complete the goal.',
  '不能虚手。':'Cannot pass.','无法完成数目。':'Unable to complete scoring.',
  '现在不能落子。':'You cannot play a move right now.',
  '当前不能虚手。':'You cannot pass right now.',
  '请点击一块棋子进行死子标记。':'Click a group to mark dead stones.',
  '当前不是下棋阶段。':'The game is not in the playing phase.',
  '还没有进入数目阶段。':'The game is not in scoring yet.',
  '当前无需继续对局。':'No need to resume play right now.',
  '请换一个交叉点。':'Choose another intersection.',
  '你正在进入人机教学模式。对手是电脑 AI，不是真人玩家。':'You are entering AI practice. Your opponent is a computer AI, not a human.',
  '入门教学 AI':'Beginner teaching AI','进阶教学 AI':'Advanced teaching AI',
  '教学 AI（电脑）':'Teaching AI (computer)',
};

const lessonStrings=new Map<string,string>();
const fields=['chapter','title','badge','concept','why','task','hint','expand','mistake','success'] as const;
for(const lesson of GO_LESSONS){
  const english=englishLessons[lesson.id]??lesson.english;
  if(!english)continue;
  for(const field of fields){
    if(typeof lesson[field]==='string')lessonStrings.set(lesson[field],english[field]);
  }
}

export function translateText(value:string,language:Language):string{
  if(language!=='en'||!value)return value;
  const match=value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const left=match?.[1]??'', raw=match?.[2]??value, right=match?.[3]??'';
  if(!raw)return value;
  let result=UI[raw]??lessonStrings.get(raw);
  if(result!==undefined)return left+result+right;
  // Dynamic teacher advice from the shared, language-independent heuristic engine.
  let m:RegExpMatchArray|null;
  if((m=raw.match(/^提走 (\d+) 颗棋子$/)))result=`Capture ${m[1]} stone(s)`;
  else if((m=raw.match(/^救活自己的 (\d+) 颗棋子$/)))result=`Save ${m[1]} friendly stone(s)`;
  else if((m=raw.match(/^叫吃对手 (\d+) 子$/)))result=`Put ${m[1]} enemy stone(s) in atari`;
  else if((m=raw.match(/^落在 ([A-Z]\d+)，会让相邻的对方棋块失去最后一口气，从棋盘上提走 (\d+) 子。围棋里先检查能否提子，是很好的习惯。$/)))result=`Playing ${m[1]} removes the last liberty of a nearby enemy group, capturing ${m[2]} stone(s). Always check for captures.`;
  else if((m=raw.match(/^你的棋块原本只剩一口气（叫作“被叫吃”），下在 ([A-Z]\d+) 能增加气，暂时脱离危险。先救急再扩张。$/)))result=`Your group was in atari. Playing ${m[1]} adds liberties and gives it some safety. Handle urgent threats before expanding.`;
  else if((m=raw.match(/^下在 ([A-Z]\d+)，可使对手相邻棋块只剩一口气。下一手可能提子，但对方有机会先逃走或反击。$/)))result=`Playing ${m[1]} puts a neighboring enemy group in atari. You may capture next, but the opponent can escape or counterattack.`;
  else if((m=raw.match(/^([A-Z]\d+) 可把相邻的己方棋块连成更大的整体，减少被分别围困的风险。不过连接并不保证完全安全，还要数一数气。$/)))result=`Playing ${m[1]} connects friendly groups, making them harder to isolate. Connections still need enough liberties.`;
  else if((m=raw.match(/^([A-Z]\d+) 靠近棋盘角部。初学者可以记住“金角银边草肚皮”：角部利用两条边界，通常更容易围地。$/)))result=`${m[1]} is near a corner. Corners have two natural edges and are generally easier to surround than the center.`;
  else if((m=raw.match(/^([A-Z]\d+) 在已有棋子附近，便于连接或施压。落子后这块棋有 (\d+) 口气，注意是否容易被叫吃。$/)))result=`${m[1]} develops near existing stones, helping connection or pressure. The resulting group has ${m[2]} liberties; check for atari.`;
  else if((m=raw.match(/^([A-Z]\d+) 是一个候选落点，可以尝试控制附近空间。但还需要观察对方下一手的应对。$/)))result=`${m[1]} is a possible move to influence nearby space. Watch your opponent’s response.`;
  else if((m=raw.match(/^注意！你有 (\d+) 颗棋子处于“叫吃”危险中。$/)))result=`Warning: ${m[1]} of your stones are in atari.`;
  else if((m=raw.match(/^本课完成！(.+) AI 已经应了一手，你可以继续和它下，或者进入下一课。$/)))result=`Lesson complete! ${translateText(m[1],'en')} The AI has replied. Continue this game or move to the next lesson.`;
  else if((m=raw.match(/^老师：正确！(.+) 现在看白棋 AI 怎样回应。$/)))result=`Tutor: Correct! ${translateText(m[1],'en')} Watch how White responds.`;
  else if((m=raw.match(/^老师：(.+) 是合法的一手，但没抓住本课的核心练习点。(.+) 可以点击“重练本课”再尝试。$/)))result=`Tutor: ${m[1]} is legal, but it misses this lesson’s objective. ${translateText(m[2],'en')} Try "Retry lesson".`;
  else if((m=raw.match(/^老师：这手棋还不能下。(.+)$/)))result=`Tutor: that move is not legal. ${translateText(m[1],'en')}`;
  else if((m=raw.match(/^本课完成！(.+) 黑棋 (\d+(?:\.\d+)?) 目，白棋 (\d+(?:\.\d+)?) 目（已含贴目）。教学棋局只用于认识流程。$/)))result=`Lesson complete! ${translateText(m[1],'en')} Black ${m[2]} points; White ${m[3]} points (including komi). This is a scoring demonstration.`;
  else if((m=raw.match(/^([A-Z]\d+) 是合法的一手/)))result=raw.replace('是合法的一手','is a legal move');
  else if((m=raw.match(/^如果 (\d+) 秒内没人加入，将自动开始一盘全新的人机练习，并在开始前说明对手身份。$/)))result=`If nobody joins within ${m[1]} seconds, a clearly announced new AI practice will start.`;
  else if((m=raw.match(/^等待(黑棋|白棋)落子$/)))result=`Waiting for ${m[1]==='黑棋'?'Black':'White'} to move`;
  else if((m=raw.match(/^(黑棋|白棋)胜 · 认输结束$/)))result=`${m[1]==='黑棋'?'Black':'White'} wins by resignation`;
  else if((m=raw.match(/^(黑棋|白棋)获胜 · ([\d.]+) 目$/)))result=`${m[1]==='黑棋'?'Black':'White'} wins by ${m[2]} points`;
  else if((m=raw.match(/^平局 · ([\d.]+) 目$/)))result=`Draw · ${m[1]} points`;
  else if((m=raw.match(/^推荐先试 ([\s\S]+)。([\s\S]+)$/)))result=`Try ${m[1]}. ${translateText(m[2],'en')}`;
  else if(raw==='对方有棋块只剩一口气，寻找提子的机会。')result='An opposing group has one liberty left. Look for a capture.';
  else if(raw==='现在是布局阶段：先从角部、边上建立基础。')result='Opening phase: establish a base in the corners and along the sides.';
  else if(raw==='观察双方棋块的气，优先处理危险，然后考虑连接和围地。')result='Count liberties on both sides. Address urgent threats, then connect and build territory.';
  else if(raw==='气：与一块棋相邻的空交叉点，就是这块棋的气。相连的同色棋子共同拥有这些气；失去全部气就会被提走。')result='Liberties: empty intersections adjacent to a group. Connected stones share liberties; groups without any are captured.';
  else if(raw==='提子：当一块棋的最后一口气被堵住时，整块棋会被从棋盘上移除。')result='Capturing: when a group loses its final liberty, all its stones are removed.';
  else if(raw==='金角银边草肚皮：在同样的棋子数量下，角一般比边容易围地，边又比中央容易。但这不是必须遵守的死规则。')result='Corners, sides, center: corners generally need fewer stones to enclose territory than the sides or center. It is a guideline, not a rule.';
  else if(raw==='每走一步前可以问自己：会不会被吃？有没有棋块需要救？这一手帮助我围地还是让对方更强？')result='Before each move ask: can I be captured? Does a group need help? Am I building territory or strengthening my opponent?';
  else if(raw==='连接自己的棋块')result='Connect friendly groups';
  else if(raw==='先从角部布局')result='Open in a corner';
  else if(raw==='靠近已有棋形发展')result='Develop near existing stones';
  else if(raw==='发展棋形与地盘')result='Build shape and territory';
  else if(raw==='提子')result='Capture';
  else if(raw==='逃脱叫吃')result='Escape atari';
  else if(raw==='叫吃')result='Atari';
  else if(raw==='连接')result='Connection';
  else if(raw==='布局')result='Opening';
  else if(raw==='发展')result='Development';
  else if(raw==='方向')result='Direction';
  return left+(result??raw)+right;
}
