import type { Language, LanguageConfig } from '../types';

export const SUPPORTED_LANGUAGES: Record<Language, LanguageConfig> = {
  c: {
    id: 'c',
    name: 'C (GCC)',
    monacoLang: 'c',
    version: 'GCC 13.2',
    iconName: 'c',
    defaultStdin: '',
    defaultCode: `#include <stdio.h>

int main() {
    int a = 0, b = 0;
    printf("Enter two numbers: ");
    if (scanf("%d %d", &a, &b) == 2) {
        printf("\\nSum: %d + %d = %d\\n", a, b, a + b);
    } else {
        printf("\\nHello from Cloud Compiler C (GCC 13.2)!\\n");
    }
    printf("Compiler: GCC 13.2\\n");
    return 0;
}
`,
  },
  cpp: {
    id: 'cpp',
    name: 'C++ (g++)',
    monacoLang: 'cpp',
    version: 'GCC 13.2',
    iconName: 'cpp',
    defaultStdin: '',
    defaultCode: `#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cout << "Enter your name: ";
    if (std::cin >> name) {
        std::cout << "\\nHello, " << name << "! Welcome to Cloud Compiler." << std::endl;
    } else {
        std::cout << "\\nHello from Cloud Compiler C++ (g++)!" << std::endl;
    }
    std::cout << "Language: C++ (GCC 13.2)" << std::endl;
    return 0;
}
`,
  },
  python: {
    id: 'python',
    name: 'Python',
    monacoLang: 'python',
    version: 'Python 3.11',
    iconName: 'python',
    defaultStdin: '',
    defaultCode: `import sys

def main():
    print("Enter your name: ", end="", flush=True)
    try:
        name = sys.stdin.readline().strip()
        if name:
            print(f"\\nHello, {name}! Welcome to Cloud Compiler.")
        else:
            print("\\nHello from Cloud Compiler Python 3.11!")
    except Exception as e:
        print(f"Error reading input: {e}")
        
    print("Language: Python 3.11")

if __name__ == "__main__":
    main()
`,
  },
  java: {
    id: 'java',
    name: 'Java (OpenJDK)',
    monacoLang: 'java',
    version: 'OpenJDK 17',
    iconName: 'java',
    defaultStdin: '',
    defaultCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        if (scanner.hasNext()) {
            String name = scanner.next();
            System.out.println("\\nHello, " + name + "! Welcome to Cloud Compiler.");
        } else {
            System.out.println("\\nHello from Cloud Compiler Java!");
        }
        System.out.println("Language: OpenJDK 17 (Temurin)");
        scanner.close();
    }
}
`,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    monacoLang: 'javascript',
    version: 'Node.js 20',
    iconName: 'javascript',
    defaultStdin: '',
    defaultCode: `const fs = require('fs');

function main() {
    process.stdout.write("Enter your name: ");
    try {
        const input = fs.readFileSync(0, 'utf-8').trim();
        if (input) {
            console.log(\`\\nHello, \${input}! Welcome to Cloud Compiler.\`);
        } else {
            console.log("\\nHello from Cloud Compiler JavaScript!");
        }
    } catch {
        console.log("\\nHello from Cloud Compiler JavaScript (Node.js 20)!");
    }
    console.log("Language: Node.js 20 (V8)");
}

main();
`,
  },
};
