package main

import "fmt"

func main() {
    fmt.Println("Hello from Go")
    numbers := []int{1, 2, 3, 4, 5}
    for _, n := range numbers {
        fmt.Printf("Number: %d\n", n)
    }
}