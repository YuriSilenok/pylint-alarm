const vscode = require("vscode");
const { exec } = require("child_process");

const HELLO = {
  E: "ХА-ХА!",
  C: "Ля какой!",
  W: "Ни чё се!",
  R: "Супер джун!"
};

const TEXT = {
  E0001: "Забыл синтаксис python?",
  E0602: "Забыл объявить переменную перед ее использованием?",
  C0114: "А кто будет писать комментарий к модулю?",
  C0115: "А кто будет писать комментарий к классу?",
  C0116: "А кто будет писать комментарий к методу?",
  C0301: "А чего строка такая длинная?",
  C0303: "А для кого ты поставил пробел в конце строки?",
  C0304: "А пустую строку кто будет добавлят в конец файла?",
  C0305: "А кому ты столько сделал пустых строк в конце файла?",
  W0401: "Импортировать звоздочкой будешь в своих ПЭТ-проектах, а тут нормально пиши",
  W0611: "Наимпортировал всякий мусор, но не используешь? Импортируй так в своих ПЭТ-проектах",
  W0718: "Кто тут не может определиться, какое именно исключение он ожидает?",
  W1309: "Ну и зачем форматировать строку, если в нее ничего не подставляется?",
  R0912: "Судя по количеству ветвлений, пора этот метод разбивать на несколько отдельных",
  R0914: "Судя по количесву переменных, пора этот метод разбивать на несколько отдельных",
};

function activate(context) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection("pylint-buzzkill");
  context.subscriptions.push(diagnosticCollection);
  
  const pythonPath = getPythonInterpreter();
  exec(`"${pythonPath}" -m pip install -U pylint`, (error, stdout, stderr) => {});


  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId !== "python") return;

    if (!pythonPath) {
      vscode.window.showErrorMessage("Не удалось определить путь к интерпретатору Python.");
      return;
    }

    const filePath = document.fileName;
    
    
    
    const cmd = `"${pythonPath}" -m pylint "${filePath}" --max-line-length=80 --disable=E0401,C0325,R0903 --output-format=json`;
    // vscode.window.showInformationMessage(cmd);
    exec(cmd, (error, stdout, stderr) => {
      const diagnostics = [];

      if (!stdout || stdout.trim() === "") {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          "❌ Pylint не вернул JSON. Возможно, критическая синтаксическая ошибка.",
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
        diagnosticCollection.set(document.uri, diagnostics);
        return;
      }

      let messages;
      try {
        messages = JSON.parse(stdout);
      } catch (parseError) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `❌ Ошибка при парсинге JSON от pylint: ${parseError}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
        diagnosticCollection.set(document.uri, diagnostics);
        return;
      }

      messages.forEach((msg) => {
        // vscode.window.showErrorMessage(`${msg}, ${msg.line}, ${msg.column}, ${msg.endLine}, ${msg.endColumn}`)
        let endColumn = msg.endColumn; 
        const messageId = msg["message-id"];
        if (messageId === 'C0301'){
          endColumn=79;
        }
        const range = new vscode.Range(
          (msg.line||1)-1, 
          (msg.column||1)-1,
          (msg.endLine||msg.line)-1,
          (endColumn||(msg.column+1))
        );
        const messageText = `${HELLO[messageId[0]]||":("} ${TEXT[messageId] || msg.message}`;
        const diagnostic = new vscode.Diagnostic(
          range,
          messageText,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.code = {
          value: messageId,
          target: vscode.Uri.parse(`https://pylint.pycqa.org/en/latest/technical_reference/features.html#${messageId}`)
        };
        diagnostic.source = "ДУШНИЛА ";
        diagnostics.push(diagnostic);
      });
      diagnosticCollection.set(document.uri, diagnostics);
    });
  });
}

function getPythonInterpreter() {
  const config = vscode.workspace.getConfiguration("python");
  const pythonPath =
    config.get("defaultInterpreterPath") || config.get("pythonPath");

  return pythonPath || "python"; // fallback на системный Python
}



function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
